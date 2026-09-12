import { describePayloadShape, isNonEmptyPayload } from './trackingAdapters.mjs';

const ACT_N4_CAP_URL = 'https://cap.act.com.jo/apex/cap.zul';
const TRACK17_ENDPOINT = 'https://api.17track.net/track/v2.4/getRealTimeTrackInfo';
const APM_TOKEN_ENDPOINT = 'https://api.apmterminals.com/oauth/client_credential/accesstoken?grant_type=client_credentials';
const APM_EVENT_HISTORY_ENDPOINT = 'https://api.apmterminals.com/container-event-history';
const APM_FACILITY_CODE = 'JOAQJ';
const ISO_CONTAINER = /^[A-Z]{3}[UJZ][0-9]{7}$/;
const REQUEST_TIMEOUT_MS = Math.max(1_000, Number(process.env.RAYA_TRACKING_TIMEOUT_MS || 10_000));
const TRACK17_TIMEOUT_MS = Math.min(
  30_000,
  Math.max(1_000, Number(process.env.RAYA_17TRACK_TIMEOUT_MS || 30_000)),
);
const TRACK17_CARRIER_CODES = Object.freeze({
  cma: 100755,
});

const PROVIDERS = [
  { id: '17track', label: '17TRACK', token: process.env.RAYA_17TRACK_TOKEN },
  {
    id: 'apm',
    label: 'APM Terminals Aqaba',
    endpoint: process.env.RAYA_APM_TRACKING_URL || APM_EVENT_HISTORY_ENDPOINT,
    key: process.env.RAYA_APM_TRACKING_API_KEY,
    keyHeader: process.env.RAYA_APM_TRACKING_KEY_HEADER || 'Authorization',
    clientId: process.env.RAYA_APM_CLIENT_ID,
    clientSecret: process.env.RAYA_APM_CLIENT_SECRET,
    tokenEndpoint: process.env.RAYA_APM_TOKEN_URL || APM_TOKEN_ENDPOINT,
  },
  {
    id: 'maersk',
    label: 'Maersk Track & Trace',
    endpoint: process.env.RAYA_MAERSK_TRACKING_URL,
    key: process.env.RAYA_MAERSK_CONSUMER_KEY,
    keyHeader: 'Consumer-Key',
  },
  {
    id: 'aggregator',
    label: 'Tracking aggregator',
    endpoint: process.env.RAYA_TRACKING_AGGREGATOR_URL,
    key: process.env.RAYA_TRACKING_AGGREGATOR_KEY,
    keyHeader: 'Authorization',
  },
];

/**
 * Returns true when the payload contains a recognised event-container key
 * (events, milestones, data) with an array value — even if that array is
 * empty. This prevents false-positive unrecognised_format warnings for valid
 * no-event responses such as { events: [] } or { milestones: [] }.
 */
function hasKnownEventContainer(payload) {
  if (Array.isArray(payload)) return true;
  if (!payload || typeof payload !== 'object') return false;
  for (const key of ['events', 'milestones', 'data']) {
    const value = payload[key];
    if (Array.isArray(value)) return true;
    if (value && typeof value === 'object' && hasKnownEventContainer(value)) return true;
  }
  return false;
}

/**
 * Log a structured warning when a provider returns a non-empty payload that
 * no tracking adapter can parse. Intentionally shallow — we log shape only,
 * never event-level data, to avoid PII leakage.
 *
 * Returns a result object with reason: 'unrecognised_format' so callers can
 * distinguish this from a genuine empty-events response.
 */
function warnAndRejectUnrecognisedPayload(provider, reference, payload) {
  const payloadShape = describePayloadShape(payload);
  console.warn(JSON.stringify({
    level: 'warn',
    event: 'tracking.unrecognised_payload',
    provider: provider.id,
    reference,
    payloadShape,
    timestamp: new Date().toISOString(),
    message: 'Provider returned a non-empty payload that no adapter recognised — carrier format may have changed',
  }));
  return { ok: false, reason: 'unrecognised_format', payloadShape };
}

function safeEndpoint(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function providerConfigured(provider) {
  if (provider.id === '17track') return Boolean(String(provider.token || '').trim());
  if (provider.id === 'apm') {
    const oauthConfigured = Boolean(
      String(provider.clientId || '').trim() && String(provider.clientSecret || '').trim(),
    );
    const legacyKeyConfigured = Boolean(String(provider.key || '').trim());
    return Boolean(safeEndpoint(provider.endpoint) && (oauthConfigured || legacyKeyConfigured));
  }
  return Boolean(safeEndpoint(provider.endpoint) && String(provider.key || '').trim());
}

export function trackingProviderInfo() {
  return {
    mode: PROVIDERS.some(providerConfigured) ? 'provider-api' : 'manual',
    providers: Object.fromEntries(PROVIDERS.map((provider) => [provider.id, providerConfigured(provider)])),
    terminalFallback: 'ACT N4 CAP',
  };
}

export function normalizeTrackingReference(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9][A-Z0-9._/-]{5,39}$/.test(normalized)) return null;
  return normalized;
}

function extractEvents(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['events', 'milestones', 'data']) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    const nested = extractEvents(value);
    if (nested.length) return nested;
  }
  return [];
}

function trackingUrl(provider, reference) {
  const base = safeEndpoint(provider.endpoint);
  if (!base) return null;
  if (base.href.includes('{reference}')) {
    return new URL(base.href.replace('{reference}', encodeURIComponent(reference)));
  }
  base.searchParams.set('equipmentReference', reference);
  base.searchParams.set('UNLocationCode', 'JOAQJ');
  return base;
}

function providerHeaders(provider) {
  const headers = { Accept: 'application/json' };
  const key = String(provider.key || '').trim();
  if (!key) return headers;
  headers[provider.keyHeader] = provider.keyHeader.toLowerCase() === 'authorization' ? `Bearer ${key}` : key;
  return headers;
}

let apmAccessToken = null;
let apmAccessTokenExpiresAt = 0;

async function getApmAccessToken(provider) {
  const staticKey = String(provider.key || '').trim();
  if (staticKey) return staticKey;
  const now = Date.now();
  if (apmAccessToken && now < apmAccessTokenExpiresAt - 60_000) return apmAccessToken;

  const tokenUrl = safeEndpoint(provider.tokenEndpoint);
  if (!tokenUrl) throw new Error('apm_token_endpoint_invalid');
  const body = new URLSearchParams({
    client_id: String(provider.clientId || '').trim(),
    client_secret: String(provider.clientSecret || '').trim(),
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error('apm_oauth_' + response.status);
  const payload = await response.json();
  const token = String(payload?.access_token || '').trim();
  if (!token) throw new Error('apm_oauth_missing_token');
  const expiresIn = Math.max(60, Number(payload?.expires_in || 1_800));
  apmAccessToken = token;
  apmAccessTokenExpiresAt = now + expiresIn * 1_000;
  return token;
}

async function requestApm(provider, reference) {
  if (!providerConfigured(provider)) return { ok: false, skipped: true };
  try {
    const base = safeEndpoint(provider.endpoint);
    if (!base) return { ok: false, reason: 'provider_endpoint_invalid' };
    base.searchParams.set('assetId', reference);
    base.searchParams.set('facilityCode', APM_FACILITY_CODE);
    const token = await getApmAccessToken(provider);
    const response = await fetch(base, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const payload = await response.json();
    const events = extractEvents(payload);
    // Warn when the payload is non-empty AND has no recognised event-container
    // key. Payloads with a recognised key (events, milestones, data) but an
    // empty array are legitimate no-events responses, not format changes.
    if (!events.length && isNonEmptyPayload(payload) && !hasKnownEventContainer(payload)) {
      return warnAndRejectUnrecognisedPayload(provider, reference, payload);
    }
    return events.length ? { ok: true, events } : { ok: false, reason: 'no_events' };
  } catch (error) {
    const message = String(error?.message || '');
    if (message.startsWith('apm_oauth_')) return { ok: false, reason: 'authentication_failed' };
    return { ok: false, reason: error?.name === 'TimeoutError' ? 'timeout' : 'provider_unavailable' };
  }
}

function stageToEventType(stage) {
  const normalized = String(stage || '').toLowerCase();
  if (normalized.includes('departure') || normalized.includes('departed')) return 'DEPA';
  if (normalized.includes('arrival') || normalized.includes('arrived')) return 'ARRI';
  if (normalized.includes('loaded') || normalized.includes('onboard')) return 'LOAD';
  if (normalized.includes('discharge') || normalized.includes('unloaded')) return 'DISCH';
  if (normalized.includes('gate in') || normalized.includes('gate-in')) return 'GTIN';
  if (normalized.includes('gate out') || normalized.includes('gate-out')) return 'GTOT';
  if (normalized.includes('availableforpickup') || normalized.includes('available for pickup')) return 'AVPU';
  // Parcel delivery is not evidence of an ACT terminal gate-out or Customs release.
  return 'UNKNOWN';
}

function map17TrackEvents(payload, reference) {
  const providers = payload?.data?.accepted?.[0]?.track_info?.tracking?.providers;
  if (!Array.isArray(providers)) return [];
  const seen = new Set();
  return providers
    .flatMap((provider) => Array.isArray(provider?.events) ? provider.events : [])
    .map((event) => {
      const eventType = stageToEventType(event?.stage || event?.sub_status);
      const eventTime = event?.time_utc || event?.time_iso || null;
      const locationName = event?.location || event?.address?.city || null;
      return {
        eventType,
        eventTime,
        equipmentReference: reference,
        eventLocation: { locationName },
        eventClassifierCode: 'ACT',
      };
    })
    .filter((event) => {
      const key = `${event.eventType}|${event.eventTime || ''}|${event.eventLocation.locationName || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function track17RejectionReason(payload) {
  const code = payload?.data?.rejected?.[0]?.error?.code;
  return Number.isInteger(code) ? `provider_rejected_${code}` : 'provider_rejected';
}

function safeProviderDetail(value) {
  const detail = String(value || '').replace(/\s+/g, ' ').trim();
  return detail ? detail.slice(0, 240) : undefined;
}

function track17NoEventDetail(payload) {
  const accepted = payload?.data?.accepted?.[0];
  const providers = accepted?.track_info?.tracking?.providers;
  if (!Array.isArray(providers)) return undefined;
  const provider = providers.find((candidate) => candidate?.provider_tips)
    || providers.find((candidate) => candidate?.latest_sync_status);
  return safeProviderDetail(
    provider?.provider_tips
      || (provider?.latest_sync_status ? `Carrier sync status: ${provider.latest_sync_status}` : ''),
  );
}

/**
 * Returns true when a 17TRACK response (code === 0) signals a structural
 * format change, covering three failure modes:
 *
 * 1. data itself is absent or non-object — unexpected for a success code.
 * 2. data.accepted is not an array (absent or renamed/moved), AND no
 *    rejection array is present (a rejection-only response is legitimate).
 * 3. data.accepted has an item but track_info.tracking.providers is absent
 *    or not an array — the standard event-extraction path is broken.
 *
 * Preserves documented legitimate responses:
 * - Rejection-only: data.rejected has items and data.accepted is absent.
 * - Empty-providers: data.accepted[0].track_info.tracking.providers === [].
 */
function is17TrackStructurallyChanged(payload) {
  if (payload?.code !== 0) return false;

  const data = payload?.data;

  // Case 1: data missing or wrong type after a success code.
  if (!data || typeof data !== 'object') {
    return isNonEmptyPayload(payload);
  }

  // Case 2: data.accepted is not an array (absent, null, or renamed).
  if (!Array.isArray(data.accepted)) {
    // Legitimate: a rejection-only response has rejected[] with items.
    if (Array.isArray(data.rejected) && data.rejected.length > 0) return false;
    // Otherwise non-array/absent accepted with no rejection is suspicious.
    return isNonEmptyPayload(data);
  }

  // Case 3: data.accepted is an array — check the first item's expected structure.
  const accepted0 = data.accepted[0];
  if (!accepted0 || typeof accepted0 !== 'object') return false;
  const providers = accepted0?.track_info?.tracking?.providers;
  return !Array.isArray(providers);
}

async function request17Track(provider, reference, carrierId) {
  if (!providerConfigured(provider)) return { ok: false, skipped: true };
  try {
    const requestItem = { number: reference, lang: 'en', cacheLevel: 0 };
    const carrierCode = TRACK17_CARRIER_CODES[String(carrierId || '').toLowerCase()];
    if (carrierCode) requestItem.carrier = carrierCode;
    const response = await fetch(TRACK17_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', '17token': provider.token.trim() },
      // Standard cache mode costs one quota. Instant mode costs ten and is intentionally not used.
      body: JSON.stringify([requestItem]),
      signal: AbortSignal.timeout(TRACK17_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const payload = await response.json();
    if (payload?.code !== 0) return { ok: false, reason: 'provider_rejected' };
    const events = map17TrackEvents(payload, reference);
    if (!events.length) {
      // Detect structural format change: a successful, accepted response where
      // the standard track_info.tracking.providers path is absent or not an
      // array indicates the 17TRACK schema may have changed. Distinguish this
      // from a legitimate empty-providers response (providers === []).
      if (is17TrackStructurallyChanged(payload)) {
        return warnAndRejectUnrecognisedPayload(provider, reference, payload);
      }
      const rejection = payload?.data?.rejected?.[0]?.error;
      if (rejection) {
        return {
          ok: false,
          reason: track17RejectionReason(payload),
          detail: safeProviderDetail(rejection.message),
        };
      }
      if (payload?.data?.accepted?.length) {
        return { ok: false, reason: 'no_events', detail: track17NoEventDetail(payload) };
      }
      return { ok: false, reason: 'provider_rejected' };
    }
    return { ok: true, events };
  } catch (error) {
    return { ok: false, reason: error?.name === 'TimeoutError' ? 'timeout' : 'provider_unavailable' };
  }
}

async function requestProvider(provider, reference, carrierId) {
  if (provider.id === '17track') return request17Track(provider, reference, carrierId);
  if (
    provider.id === 'apm'
    && String(provider.clientId || '').trim()
    && String(provider.clientSecret || '').trim()
  ) return requestApm(provider, reference);
  const url = trackingUrl(provider, reference);
  if (!url || !providerConfigured(provider)) return { ok: false, skipped: true };
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: providerHeaders(provider),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const payload = await response.json();
    const events = extractEvents(payload);
    // Warn when the payload is non-empty AND has no recognised event-container
    // key. Payloads with a recognised key (events, milestones, data) but an
    // empty array are legitimate no-events responses, not format changes.
    if (!events.length && isNonEmptyPayload(payload) && !hasKnownEventContainer(payload)) {
      return warnAndRejectUnrecognisedPayload(provider, reference, payload);
    }
    return events.length ? { ok: true, events } : { ok: false, reason: 'no_events' };
  } catch (error) {
    return { ok: false, reason: error?.name === 'TimeoutError' ? 'timeout' : 'provider_unavailable' };
  }
}

function eventValue(event, ...paths) {
  for (const path of paths) {
    let value = event;
    for (const segment of path.split('.')) value = value && typeof value === 'object' ? value[segment] : null;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function mergeProviderEvents(providerResults) {
  const merged = new Map();
  for (const { provider, result } of providerResults) {
    if (!result?.ok || !Array.isArray(result.events)) continue;
    for (const raw of result.events) {
      const event = raw && typeof raw === 'object' ? { ...raw } : { milestone: String(raw || '') };
      const eventType = eventValue(event, 'equipmentEventTypeCode', 'eventTypeCode', 'eventType', 'type', 'milestone');
      const eventTime = eventValue(event, 'eventDateTime', 'eventTime', 'timestamp', 'time');
      const location = eventValue(
        event,
        'eventLocation.UNLocationCode',
        'eventLocation.locationName',
        'location.UNLocationCode',
        'location.locationName',
        'location',
      );
      const equipment = eventValue(event, 'equipmentReference', 'containerNo', 'container');
      const key = [eventType, eventTime, location, equipment].join('|').toUpperCase();
      const annotated = { ...event, sourceProvider: provider.id, sourceLabel: provider.label };
      const existing = merged.get(key);
      // Aqaba terminal events are authoritative when two providers report the same milestone.
      if (!existing || provider.id === 'apm') merged.set(key, annotated);
    }
  }
  return [...merged.values()].sort((left, right) => {
    const leftTime = Date.parse(eventValue(left, 'eventDateTime', 'eventTime', 'timestamp', 'time'));
    const rightTime = Date.parse(eventValue(right, 'eventDateTime', 'eventTime', 'timestamp', 'time'));
    if (!Number.isFinite(leftTime)) return 1;
    if (!Number.isFinite(rightTime)) return -1;
    return leftTime - rightTime;
  });
}

export async function getBestTerminalTracking(referenceValue, preferredProvider, carrierId) {
  const reference = normalizeTrackingReference(referenceValue);
  if (!reference) return { ok: false, error: 'invalid_reference' };

  const checkedAt = new Date().toISOString();
  const referenceType = ISO_CONTAINER.test(reference) ? 'container' : 'bill_of_lading';
  const preferred = String(preferredProvider || '').toLowerCase();
  const ordered = preferred
    ? [...PROVIDERS.filter((provider) => provider.id === preferred), ...PROVIDERS.filter((provider) => provider.id !== preferred)]
    : [...PROVIDERS];

  const providerResults = await Promise.all(ordered.map(async (provider) => {
    const configured = providerConfigured(provider);
    if (!configured) {
      return {
        provider,
        result: null,
        attempt: { provider: provider.id, label: provider.label, configured: false, ok: false, reason: 'not_configured' },
      };
    }
    if (provider.id === 'apm' && referenceType !== 'container') {
      return {
        provider,
        result: null,
        attempt: { provider: provider.id, label: provider.label, configured: true, ok: false, reason: 'container_required' },
      };
    }

    const startedAt = Date.now();
    const result = await requestProvider(provider, reference, carrierId);
    const eventCount = Array.isArray(result.events) ? result.events.length : 0;
    const ok = Boolean(result.ok && eventCount);
    return {
      provider,
      result,
      attempt: {
        provider: provider.id,
        label: provider.label,
        configured: true,
        ok,
        status: result.status,
        reason: ok ? undefined : result.reason || (result.ok ? 'no_events' : 'provider_unavailable'),
        detail: ok ? undefined : result.detail,
        eventCount,
        durationMs: Math.max(1, Date.now() - startedAt),
      },
    };
  }));

  const events = mergeProviderEvents(providerResults);
  const successful = providerResults.filter(({ attempt }) => attempt.ok);
  const sourceLabels = [...new Set(successful.map(({ provider }) => provider.label))];
  const latestEvent = events[events.length - 1];
  const locationCode = eventValue(latestEvent, 'eventLocation.UNLocationCode', 'location.UNLocationCode') || 'JOAQJ';

  if (events.length) {
    return {
      ok: true,
      reference,
      referenceType,
      checkedAt,
      live: true,
      source: successful.length > 1 ? 'combined' : successful[0].provider.id,
      sourceLabel: sourceLabels.join(' + '),
      locationCode,
      events,
      attempts: providerResults.map(({ attempt }) => attempt),
      n4CapUrl: ACT_N4_CAP_URL,
      disclaimer: 'Carrier and terminal events are reconciled for visibility. ACT N4 CAP and Customs records remain authoritative for availability, free time, release and gate decisions.',
    };
  }

  return {
    ok: true,
    reference,
    referenceType,
    checkedAt,
    live: false,
    source: 'manual_act',
    sourceLabel: 'ACT N4 CAP',
    locationCode: 'JOAQJ',
    events: [],
    attempts: providerResults.map(({ attempt }) => attempt),
    n4CapUrl: ACT_N4_CAP_URL,
    disclaimer: providerResults.some(({ attempt }) => attempt.configured)
      ? 'Configured providers returned no usable events. Confirm the reference and carrier, then verify terminal truth in ACT N4 CAP.'
      : 'No provider API is configured. Configure a server-side provider or verify terminal truth in ACT N4 CAP.',
  };
}
