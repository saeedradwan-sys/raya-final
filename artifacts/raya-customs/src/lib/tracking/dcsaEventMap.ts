/**
 * Canonical DCSA-aligned event dictionary for Raya tracking.
 * All provider adapters must map into this set before persistence or UI.
 */

export type RayaDcsaEventType =
  | 'RECE'
  | 'GTIN'
  | 'LOAD'
  | 'DEPA'
  | 'ARRI'
  | 'DISCH'
  | 'GTOT'
  | 'RESTOW'
  | 'AVPU'
  | 'AVDO'
  | 'UNKNOWN';

export type RayaDcsaClassifier = 'ACT' | 'PLN' | 'EST';

export interface NormalizedTrackingEvent {
  eventType: RayaDcsaEventType;
  classifier: RayaDcsaClassifier | null;
  eventTime: string;
  locationCode: string | null;
  locationName: string | null;
  vessel: string | null;
  voyage: string | null;
  source: string;
  rawPayload: unknown;
}

export const DCSA_PHASE: Record<RayaDcsaEventType, 'outbound' | 'ocean' | 'inbound' | 'other'> = {
  RECE: 'outbound',
  GTIN: 'outbound',
  LOAD: 'outbound',
  DEPA: 'ocean',
  ARRI: 'ocean',
  DISCH: 'inbound',
  GTOT: 'inbound',
  RESTOW: 'ocean',
  AVPU: 'other',
  AVDO: 'other',
  UNKNOWN: 'other',
};

export const DCSA_LABELS_EN: Record<RayaDcsaEventType, string> = {
  RECE: 'Empty released',
  GTIN: 'Gate-in (full)',
  LOAD: 'Loaded on vessel',
  DEPA: 'Vessel departed',
  ARRI: 'Vessel arrived',
  DISCH: 'Discharged',
  GTOT: 'Gate-out',
  RESTOW: 'Restow',
  AVPU: 'Available for pickup',
  AVDO: 'Available for drop-off',
  UNKNOWN: 'Unknown event',
};

export const DCSA_LABELS_AR: Record<RayaDcsaEventType, string> = {
  RECE: 'تسليم فارغة',
  GTIN: 'دخول البوابة (ممتلئة)',
  LOAD: 'تحميل على السفينة',
  DEPA: 'مغادرة السفينة',
  ARRI: 'وصول السفينة',
  DISCH: 'تفريغ',
  GTOT: 'خروج البوابة',
  RESTOW: 'إعادة رص',
  AVPU: 'جاهزة للاستلام',
  AVDO: 'جاهزة للإرجاع',
  UNKNOWN: 'حدث غير معروف',
};

export function mapStatusTextToDcsa(status: string): RayaDcsaEventType {
  const s = status.trim().toLowerCase();
  if (!s) return 'UNKNOWN';

  const rules: Array<[RegExp, RayaDcsaEventType]> = [
    [/\b(empty\s*(released|out)|rece|pick\s*up\s*empty)\b/, 'RECE'],
    [/\b(gate[\s-]?in|gtin|full\s*in)\b/, 'GTIN'],
    [/\b(loaded|load\s*on|on\s*board)\b/, 'LOAD'],
    [/\b(depart|sailed|vessel\s*left|vdes|depa)\b/, 'DEPA'],
    [/\b(arriv|vessel\s*arrived|varr|arri)\b/, 'ARRI'],
    [/\b(discharg|unload|disc\b|disch)\b/, 'DISCH'],
    [/\b(gate[\s-]?out|gtot|picked\s*up|delivery)\b/, 'GTOT'],
    [/\b(restow)\b/, 'RESTOW'],
    [/\b(available\s*for\s*pick|avpu)\b/, 'AVPU'],
    [/\b(available\s*for\s*drop|avdo)\b/, 'AVDO'],
  ];

  for (const [re, code] of rules) {
    if (re.test(s)) return code;
  }
  return 'UNKNOWN';
}

export function isIso6346Container(value: string): boolean {
  return /^[A-Z]{4}[0-9]{7}$/.test(String(value || '').trim().toUpperCase());
}

export function normalizeContainerNumber(value: string): string | null {
  const n = String(value || '').trim().toUpperCase().replace(/[\s-]/g, '');
  return isIso6346Container(n) ? n : null;
}
