export type DcsaEventClassifierCode = 'ACT' | 'PLN' | 'EST';
export type DcsaEquipmentEventTypeCode =
  | 'LOAD'
  | 'DISCH'
  | 'GTIN'
  | 'GTOT'
  | 'RESTOW'
  | 'ARRI'
  | 'DEPA'
  | 'AVPU'
  | 'AVDO'
  | 'UNKNOWN';

export interface DcsaLocation {
  UNLocationCode?: string;
  locationName?: string;
}

export interface DcsaTransportCall {
  vessel?: { vesselName?: string; name?: string };
}

export interface DcsaEquipmentEvent {
  eventClassifierCode?: string;
  eventDateTime?: string;
  equipmentEventTypeCode?: string;
  equipmentReference?: string;
  eventLocation?: DcsaLocation;
  transportCall?: DcsaTransportCall;
  documentReferences?: Array<{ documentReferenceType?: string; documentReferenceValue?: string }>;
  [key: string]: unknown;
}

export interface NormalizedDcsaEvent {
  eventType: DcsaEquipmentEventTypeCode;
  classifier: DcsaEventClassifierCode | null;
  eventTime: string | null;
  equipmentReference: string | null;
  locationCode: string | null;
  locationName: string | null;
  vessel: string | null;
  billOfLading: string | null;
  sourceProvider: string | null;
  sourceLabel: string | null;
}
export const DCSA_SCHEMA_NOTES_EN = [
  'Prefer eventLocation.UNLocationCode (UN/LOCODE), such as JOAQJ for Aqaba.',
  'Use ACT classifier events for operational clocks; PLN and EST remain provisional.',
  'equipmentEventTypeCode carries equipment milestones such as LOAD, DISCH, GTIN, and GTOT.',
  'equipmentReference is the container identifier; eventDateTime should be ISO 8601.',
  'DCSA events do not define ACT free days or demurrage tariffs; Raya calculates those locally.',
] as const;

export const DCSA_SCHEMA_NOTES_AR = [
  'يفضل استخدام eventLocation.UNLocationCode مثل JOAQJ للعقبة.',
  'تستخدم أحداث ACT للتوقيت التشغيلي، بينما تبقى PLN وEST تقديرية.',
  'يحمل equipmentEventTypeCode أحداث الحاوية مثل LOAD وDISCH وGTIN وGTOT.',
  'يمثل equipmentReference رقم الحاوية، ويجب أن يكون eventDateTime بصيغة ISO 8601.',
  'لا تحدد أحداث DCSA أيام ACT المجانية أو غرامات التأخير؛ تحسبها راية محلياً.',
] as const;