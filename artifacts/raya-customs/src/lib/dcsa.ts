import { normalizeLocation } from '@/lib/locodes';
import type {
  DcsaEquipmentEvent,
  DcsaEquipmentEventTypeCode,
  DcsaEventClassifierCode,
  NormalizedDcsaEvent,
} from '@/lib/dcsaTypes';

const EVENT_ALIASES: Record<string, DcsaEquipmentEventTypeCode> = {
  LOAD: 'LOAD',
  LOADED: 'LOAD',
  LOADED_ON_VESSEL: 'LOAD',
  DISCH: 'DISCH',
  DISCHARGE: 'DISCH',
  DISCHARGED: 'DISCH',
  DISCHARGED_FROM_VESSEL: 'DISCH',
  UNLOAD: 'DISCH',
  GTIN: 'GTIN',
  GATEIN: 'GTIN',
  GATE_IN: 'GTIN',
  IN_GATE: 'GTIN',
  GTOT: 'GTOT',
  GATEOUT: 'GTOT',
  GATE_OUT: 'GTOT',
  OUT_GATE: 'GTOT',
  RESTOW: 'RESTOW',
  ARRI: 'ARRI',
  ARRIVAL: 'ARRI',
  ARRIVED: 'ARRI',
  DEPA: 'DEPA',
  DEPARTURE: 'DEPA',
  DEPARTED: 'DEPA',
  AVPU: 'AVPU',
  AVAILABLE: 'AVPU',
  AVAILABLE_FOR_PICKUP: 'AVPU',
  AVDO: 'AVDO',
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function classifier(value: unknown): DcsaEventClassifierCode | null {
  const normalized = text(value)?.toUpperCase();
  if (normalized === 'ACT' || normalized === 'ACTUAL') return 'ACT';
  if (normalized === 'PLN' || normalized === 'PLANNED') return 'PLN';
  if (normalized === 'EST' || normalized === 'ESTIMATED') return 'EST';
  return null;
}

export function normalizeDcsaEventType(value: unknown): DcsaEquipmentEventTypeCode {
  const normalized = text(value)?.toUpperCase().replace(/[\s-]+/g, '_') || '';
  return EVENT_ALIASES[normalized] || EVENT_ALIASES[normalized.replace(/_/g, '')] || 'UNKNOWN';
}

function eventRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = record(payload);
  for (const key of ['events', 'milestones', 'data']) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = eventRows(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function normalizeDcsaEvents(payload: unknown): NormalizedDcsaEvent[] {
  return eventRows(payload).map((raw) => {
    const event = record(raw) as DcsaEquipmentEvent;
    const location = record(event.eventLocation || event.location);
    const transportCall = record(event.transportCall);
    const vessel = record(transportCall.vessel);
    const references = Array.isArray(event.documentReferences) ? event.documentReferences : [];
    const bl = references.find((item) => {
      const ref = record(item);
      return text(ref.documentReferenceType)?.toUpperCase().includes('BILL');
    });
    const locationName = text(location.locationName, location.name, event.location);
    const rawLocationCode = text(location.UNLocationCode, location.unlocode, location.locationCode, locationName);

    return {
      eventType: normalizeDcsaEventType(event.equipmentEventTypeCode || event.eventTypeCode || event.eventType || event.type || event.milestone),
      classifier: classifier(event.eventClassifierCode || event.classifier || event.status),
      eventTime: text(event.eventDateTime, event.eventTime, event.timestamp, event.time),
      equipmentReference: text(event.equipmentReference, event.containerNo, event.container),
      locationCode: normalizeLocation(rawLocationCode),
      locationName,
      vessel: text(vessel.vesselName, vessel.name, event.vesselName, event.vessel),
      billOfLading: bl ? text(record(bl).documentReferenceValue) : text(event.billOfLading, event.blNo),
      sourceProvider: text(event.sourceProvider, event.source),
      sourceLabel: text(event.sourceLabel),
    };
  });
}

export function phaseHintFromDcsaEvent(event: NormalizedDcsaEvent): 'ocean' | 'discharged' | 'free_time' | 'released' | 'unknown' {
  if (event.eventType === 'LOAD' || event.eventType === 'ARRI' || event.eventType === 'DEPA') return 'ocean';
  if (event.eventType === 'DISCH') return 'discharged';
  if (event.eventType === 'GTIN' || event.eventType === 'AVPU') return 'free_time';
  if (event.eventType === 'GTOT') return 'released';
  return 'unknown';
}