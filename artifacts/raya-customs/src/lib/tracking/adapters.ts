/**
 * Provider adapters that normalize raw tracking payloads into
 * NormalizedTrackingEvent records (see dcsaEventMap.ts).
 *
 * Reconstructed module: the original file was not part of the repository
 * snapshot. Each adapter maps a provider payload shape into the canonical
 * DCSA-aligned event dictionary.
 */
import {
  mapStatusTextToDcsa,
  type NormalizedTrackingEvent,
  type RayaDcsaClassifier,
} from './dcsaEventMap';

interface RawEventLike {
  status?: string;
  description?: string;
  eventType?: string;
  classifier?: string;
  time?: string;
  eventTime?: string;
  date?: string;
  locationCode?: string;
  location?: string;
  locationName?: string;
  vessel?: string;
  voyage?: string;
  // DCSA-native field names (Track & Trace equipment events)
  equipmentEventTypeCode?: string;
  eventClassifierCode?: string;
  eventDateTime?: string;
  eventLocation?: {
    UNLocationCode?: string;
    locationName?: string;
    [key: string]: unknown;
  };
  transportCall?: {
    vessel?: { vesselName?: string; [key: string]: unknown };
    exportVoyageNumber?: string;
    carrierVoyageNumber?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const DCSA_EVENT_CODES = new Set([
  'RECE', 'GTIN', 'LOAD', 'DEPA', 'ARRI', 'DISC', 'DISCH', 'GTOT', 'RSTW', 'RESTOW', 'AVPU', 'AVDO',
]);

function dcsaCodeToEventType(code: string): NormalizedTrackingEvent['eventType'] {
  const c = code.toUpperCase();
  if (c === 'DISC') return 'DISCH';
  if (c === 'RSTW') return 'RESTOW';
  return DCSA_EVENT_CODES.has(c)
    ? (c as NormalizedTrackingEvent['eventType'])
    : 'UNKNOWN';
}

function toClassifier(value: unknown): RayaDcsaClassifier | null {
  const v = String(value ?? '').toUpperCase();
  return v === 'ACT' || v === 'PLN' || v === 'EST' ? v : null;
}

function toIsoTime(raw: RawEventLike): string {
  const candidate = raw.eventDateTime || raw.eventTime || raw.time || raw.date || '';
  const parsed = new Date(String(candidate));
  return Number.isNaN(parsed.getTime())
    ? String(candidate)
    : parsed.toISOString();
}

export abstract class TrackingAdapter {
  abstract readonly source: string;

  /** Return true when this adapter understands the given payload. */
  abstract matches(payload: unknown): boolean;

  /** Normalize a provider payload into canonical events. */
  abstract normalize(payload: unknown): NormalizedTrackingEvent[];

  protected buildEvent(raw: RawEventLike): NormalizedTrackingEvent {
    // Prefer DCSA-native codes when present, fall back to free-text mapping.
    const dcsaCode = raw.equipmentEventTypeCode || '';
    const statusText = String(raw.status || raw.description || raw.eventType || '');
    const eventType = dcsaCode
      ? dcsaCodeToEventType(dcsaCode)
      : mapStatusTextToDcsa(statusText);
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
      source: this.source,
      rawPayload: raw,
    };
  }
}

/** 17TRACK-style payloads: { data: { events: [...] } } or { events: [...] }. */
export class SeventeenTrackAdapter extends TrackingAdapter {
  readonly source = '17track';

  matches(payload: unknown): boolean {
    const p = payload as { data?: { events?: unknown[] }; events?: unknown[] } | null;
    return Boolean(p && (Array.isArray(p.events) || Array.isArray(p.data?.events)));
  }

  normalize(payload: unknown): NormalizedTrackingEvent[] {
    const p = payload as { data?: { events?: RawEventLike[] }; events?: RawEventLike[] };
    const events = p.events ?? p.data?.events ?? [];
    return events.map((e) => this.buildEvent(e));
  }
}

/** Maersk/DCSA-native payloads: events already carry eventType + classifier. */
export class MaerskDcsaAdapter extends TrackingAdapter {
  readonly source = 'maersk-dcsa';

  matches(payload: unknown): boolean {
    const events = Array.isArray(payload)
      ? (payload as RawEventLike[])
      : ((payload as { events?: RawEventLike[] } | null)?.events ?? null);
    return Boolean(
      events?.some(
        (e) =>
          typeof e.equipmentEventTypeCode === 'string' ||
          typeof e.eventClassifierCode === 'string' ||
          typeof e.eventDateTime === 'string',
      ),
    );
  }

  normalize(payload: unknown): NormalizedTrackingEvent[] {
    const events = Array.isArray(payload)
      ? (payload as RawEventLike[])
      : ((payload as { events?: RawEventLike[] }).events ?? []);
    return events.map((e) => this.buildEvent(e));
  }
}

/** Free-text status feeds: an array of { status, time, location } rows. */
export class GenericStatusAdapter extends TrackingAdapter {
  readonly source = 'generic';

  matches(payload: unknown): boolean {
    return Array.isArray(payload);
  }

  normalize(payload: unknown): NormalizedTrackingEvent[] {
    return (Array.isArray(payload) ? (payload as RawEventLike[]) : []).map((e) =>
      this.buildEvent(e),
    );
  }
}

/** Manual ACT terminal entries recorded by staff. */
export class ActManualAdapter extends TrackingAdapter {
  readonly source = 'act-manual';

  matches(payload: unknown): boolean {
    const p = payload as { source?: string } | null;
    return Boolean(p && p.source === 'act-manual');
  }

  normalize(payload: unknown): NormalizedTrackingEvent[] {
    const p = payload as { source?: string; events?: RawEventLike[] };
    return (p.events ?? []).map((e) => this.buildEvent(e));
  }
}

const ADAPTERS: TrackingAdapter[] = [
  new ActManualAdapter(),
  new MaerskDcsaAdapter(),
  new SeventeenTrackAdapter(),
  new GenericStatusAdapter(),
];

/** Pick the first adapter that understands the payload. */
export function pickAdapter(payload: unknown): TrackingAdapter | null {
  return ADAPTERS.find((a) => a.matches(payload)) ?? null;
}
