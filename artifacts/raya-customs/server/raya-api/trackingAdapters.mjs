/**
 * Server-side tracking adapter utilities (plain JS/ESM).
 *
 * Mirrors the TypeScript adapter logic in
 * src/lib/tracking/adapters.ts so the Node.js server can call
 * pickAdapter without a build step.
 */

// ---------------------------------------------------------------------------
// Lightweight DCSA status-text mapper
// ---------------------------------------------------------------------------

const STATUS_RULES = [
  [/\b(empty\s*(released|out)|rece|pick\s*up\s*empty)\b/, 'RECE'],
  [/\b(gate[\s-]?in|gtin|full\s*in)\b/, 'GTIN'],
  [/\b(loaded|load\s*on|on\s*board)\b/, 'LOAD'],
  [/\b(depart\w*|sailed|vessel\s*left|vdes|depa)\b/, 'DEPA'],
  [/\b(arriv\w*|vessel\s*arrived|varr|arri)\b/, 'ARRI'],
  [/\b(discharg\w*|unload\w*|disc\b|disch\b)/, 'DISCH'],
  [/\b(gate[\s-]?out|gtot|picked\s*up|delivery)\b/, 'GTOT'],
  [/\b(restow)\b/, 'RESTOW'],
  [/\b(available\s*for\s*pick\w*|avpu)\b/, 'AVPU'],
  [/\b(available\s*for\s*drop\w*|avdo)\b/, 'AVDO'],
];

function mapStatusTextToDcsa(status) {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return 'UNKNOWN';
  for (const [re, code] of STATUS_RULES) {
    if (re.test(s)) return code;
  }
  return 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// DCSA equipment event type normalisation
// ---------------------------------------------------------------------------

const DCSA_EVENT_CODES = new Set([
  'RECE', 'GTIN', 'LOAD', 'DEPA', 'ARRI', 'DISC', 'DISCH', 'GTOT',
  'RSTW', 'RESTOW', 'AVPU', 'AVDO',
]);

function dcsaCodeToEventType(code) {
  const c = String(code || '').toUpperCase();
  if (c === 'DISC') return 'DISCH';
  if (c === 'RSTW') return 'RESTOW';
  return DCSA_EVENT_CODES.has(c) ? c : 'UNKNOWN';
}

function toClassifier(value) {
  const v = String(value ?? '').toUpperCase();
  return v === 'ACT' || v === 'PLN' || v === 'EST' ? v : null;
}

function toIsoTime(raw) {
  const candidate = raw.eventDateTime || raw.eventTime || raw.time || raw.date || '';
  const parsed = new Date(String(candidate));
  return Number.isNaN(parsed.getTime()) ? String(candidate) : parsed.toISOString();
}

// ---------------------------------------------------------------------------
// Shared event builder
// ---------------------------------------------------------------------------

function buildEvent(raw, source) {
  const dcsaCode = raw.equipmentEventTypeCode || '';
  const statusText = String(raw.status || raw.description || raw.eventType || '');
  const eventType = dcsaCode ? dcsaCodeToEventType(dcsaCode) : mapStatusTextToDcsa(statusText);
  const location = raw.eventLocation;
  const vesselName = raw.vessel || raw.transportCall?.vessel?.vesselName;
  const voyage =
    raw.voyage ||
    raw.transportCall?.exportVoyageNumber ||
    raw.transportCall?.carrierVoyageNumber;
  return {
    eventType,
    classifier: toClassifier(raw.eventClassifierCode ?? raw.classifier),
    eventTime: toIsoTime(raw),
    locationCode: raw.locationCode
      ? String(raw.locationCode)
      : location?.UNLocationCode
        ? String(location.UNLocationCode)
        : null,
    locationName: raw.locationName
      ? String(raw.locationName)
      : location?.locationName
        ? String(location.locationName)
        : raw.location
          ? String(raw.location)
          : null,
    vessel: vesselName ? String(vesselName) : null,
    voyage: voyage ? String(voyage) : null,
    source,
    rawPayload: raw,
  };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/** ActManualAdapter – payloads with source === 'act-manual' */
const actManualAdapter = {
  source: 'act-manual',
  matches(payload) {
    return Boolean(payload && payload.source === 'act-manual');
  },
  normalize(payload) {
    return (payload?.events ?? []).map((e) => buildEvent(e, this.source));
  },
};

/** MaerskDcsaAdapter – arrays or { events } with DCSA native fields */
const maerskDcsaAdapter = {
  source: 'maersk-dcsa',
  matches(payload) {
    const events = Array.isArray(payload)
      ? payload
      : (payload?.events ?? null);
    return Boolean(
      Array.isArray(events) &&
        events.some(
          (e) =>
            typeof e?.equipmentEventTypeCode === 'string' ||
            typeof e?.eventClassifierCode === 'string' ||
            typeof e?.eventDateTime === 'string',
        ),
    );
  },
  normalize(payload) {
    const events = Array.isArray(payload) ? payload : (payload?.events ?? []);
    return events.map((e) => buildEvent(e, this.source));
  },
};

/** SeventeenTrackAdapter – { data: { events } } or { events } */
const seventeenTrackAdapter = {
  source: '17track',
  matches(payload) {
    return Boolean(
      payload &&
        (Array.isArray(payload.events) || Array.isArray(payload.data?.events)),
    );
  },
  normalize(payload) {
    const events = payload?.events ?? payload?.data?.events ?? [];
    return events.map((e) => buildEvent(e, this.source));
  },
};

/** GenericStatusAdapter – bare arrays of { status, time, location } */
const genericStatusAdapter = {
  source: 'generic',
  matches(payload) {
    return Array.isArray(payload);
  },
  normalize(payload) {
    return (Array.isArray(payload) ? payload : []).map((e) =>
      buildEvent(e, this.source),
    );
  },
};

const ADAPTERS = [
  actManualAdapter,
  maerskDcsaAdapter,
  seventeenTrackAdapter,
  genericStatusAdapter,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the first adapter that understands the payload, or null.
 * Callers MUST handle the null case — silence here produces invisible data loss.
 *
 * @param {unknown} payload
 * @returns {{ source: string, normalize: (p: unknown) => object[] } | null}
 */
export function pickAdapter(payload) {
  return ADAPTERS.find((a) => a.matches(payload)) ?? null;
}

/**
 * Describe the top-level shape of a payload for warning logs.
 * Intentionally shallow so we never log PII from event data.
 */
export function describePayloadShape(payload) {
  if (payload === null) return 'null';
  if (payload === undefined) return 'undefined';
  if (Array.isArray(payload)) return `Array(${payload.length})`;
  if (typeof payload === 'object') {
    const keys = Object.keys(payload).slice(0, 8);
    return `Object{${keys.join(',')}}`;
  }
  return typeof payload;
}

/**
 * Return true when a payload has content that a carrier probably intended to
 * convey — i.e. it is non-null, non-empty, and not just an empty array or
 * object. Used to distinguish "carrier returned something we don't recognise"
 * (dangerous — format may have changed) from "carrier returned nothing"
 * (already handled by the no_events path).
 */
export function isNonEmptyPayload(payload) {
  if (payload === null || payload === undefined) return false;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload === 'object') return Object.keys(payload).length > 0;
  return false;
}
