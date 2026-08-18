/**
 * Smoke / regression tests for dcsaEventMap.ts
 *
 * Coverage goals:
 *  1. mapStatusTextToDcsa correctly maps the canonical milestone sequence
 *     GTIN → LOAD → DEPA → ARRI → DISCH → GTOT (and AVPU) via every
 *     status-text variant that carrier adapters emit.
 *  2. DCSA_LABELS_EN and DCSA_LABELS_AR are defined and non-empty for every
 *     event type in the sequence, so the UI timeline never renders blank labels.
 *  3. DCSA_PHASE assigns each milestone to the correct leg (outbound / ocean /
 *     inbound), which drives the phase-progress indicator.
 *  4. The corrected DEPA / DISCH / AVPU regex stems that were introduced in the
 *     event-mapping fix still match after future edits.
 *
 * These tests are intentionally pure-unit (no DOM, no network) and run in the
 * existing Vitest `node` environment.
 */

import { describe, it, expect } from 'vitest';
import {
  mapStatusTextToDcsa,
  DCSA_PHASE,
  DCSA_LABELS_EN,
  DCSA_LABELS_AR,
  type RayaDcsaEventType,
} from './dcsaEventMap';

// ---------------------------------------------------------------------------
// Helper — simulate the timeline rendering pipeline:
//   raw status strings → eventType codes → labels → ordered milestones
// ---------------------------------------------------------------------------

interface RenderedMilestone {
  eventType: RayaDcsaEventType;
  labelEn: string;
  labelAr: string;
  phase: 'outbound' | 'ocean' | 'inbound' | 'other';
}

function renderTimeline(statusTexts: string[]): RenderedMilestone[] {
  return statusTexts.map((text) => {
    const eventType = mapStatusTextToDcsa(text);
    return {
      eventType,
      labelEn: DCSA_LABELS_EN[eventType],
      labelAr: DCSA_LABELS_AR[eventType],
      phase: DCSA_PHASE[eventType],
    };
  });
}

// ---------------------------------------------------------------------------
// 1. Full milestone sequence — canonical journey GTIN → LOAD → DEPA → ARRI → DISCH → GTOT
// ---------------------------------------------------------------------------

describe('Tracking timeline — canonical milestone sequence', () => {
  const canonicalInputs: Array<[string, RayaDcsaEventType]> = [
    ['Gate-in (full)', 'GTIN'],
    ['Loaded on vessel', 'LOAD'],
    ['Vessel departed', 'DEPA'],
    ['Vessel arrived', 'ARRI'],
    ['Discharged from vessel', 'DISCH'],
    ['Gate-out (delivery)', 'GTOT'],
  ];

  it.each(canonicalInputs)(
    'maps "%s" → %s',
    (statusText, expectedCode) => {
      expect(mapStatusTextToDcsa(statusText)).toBe(expectedCode);
    },
  );

  it('renders the complete journey in outbound → ocean → inbound phase order', () => {
    const texts = canonicalInputs.map(([text]) => text);
    const milestones = renderTimeline(texts);

    const phases = milestones.map((m) => m.phase);
    expect(phases).toEqual(['outbound', 'outbound', 'ocean', 'ocean', 'inbound', 'inbound']);
  });

  it('every rendered milestone has a non-empty English label', () => {
    const texts = canonicalInputs.map(([text]) => text);
    const milestones = renderTimeline(texts);
    for (const m of milestones) {
      expect(m.labelEn, `English label missing for ${m.eventType}`).toBeTruthy();
    }
  });

  it('every rendered milestone has a non-empty Arabic label', () => {
    const texts = canonicalInputs.map(([text]) => text);
    const milestones = renderTimeline(texts);
    for (const m of milestones) {
      expect(m.labelAr, `Arabic label missing for ${m.eventType}`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. DEPA — fixed stem regression (vdes / depart* / sailed variants)
// ---------------------------------------------------------------------------

describe('mapStatusTextToDcsa — DEPA regex stem (regression)', () => {
  const depaVariants = [
    'VDES',
    'vdes',
    'depart',
    'departed',
    'Vessel Departed',
    'sailed',
    'Vessel Left',
    'DEPA',
  ];

  it.each(depaVariants)('"%s" maps to DEPA', (text) => {
    expect(mapStatusTextToDcsa(text)).toBe('DEPA');
  });
});

// ---------------------------------------------------------------------------
// 3. DISCH — fixed stem regression (discharg* / unload* / disc / disch variants)
// ---------------------------------------------------------------------------

describe('mapStatusTextToDcsa — DISCH regex stem (regression)', () => {
  const dischVariants = [
    'discharged',
    'discharge',
    'Discharged from vessel',
    'unloaded',
    'unloading',
    'disc',
    'disch',
    'DISCH',
  ];

  it.each(dischVariants)('"%s" maps to DISCH', (text) => {
    expect(mapStatusTextToDcsa(text)).toBe('DISCH');
  });
});

// ---------------------------------------------------------------------------
// 4. AVPU — fixed stem regression (available for pick* / avpu variants)
// ---------------------------------------------------------------------------

describe('mapStatusTextToDcsa — AVPU regex stem (regression)', () => {
  const avpuVariants = [
    'available for pickup',
    'available for pick up',
    'available for picking',
    'AVPU',
  ];

  it.each(avpuVariants)('"%s" maps to AVPU', (text) => {
    expect(mapStatusTextToDcsa(text)).toBe('AVPU');
  });
});

// ---------------------------------------------------------------------------
// 5. Additional milestone variants
// ---------------------------------------------------------------------------

describe('mapStatusTextToDcsa — additional event variants', () => {
  const cases: Array<[string, RayaDcsaEventType]> = [
    // RECE
    ['empty released', 'RECE'],
    ['empty out', 'RECE'],
    ['pick up empty', 'RECE'],
    // GTIN
    ['gate in', 'GTIN'],
    ['gate-in', 'GTIN'],
    ['full in', 'GTIN'],
    // LOAD
    ['loaded', 'LOAD'],
    ['load on vessel', 'LOAD'],
    ['on board', 'LOAD'],
    // ARRI
    ['arrived', 'ARRI'],
    ['vessel arrived', 'ARRI'],
    ['varr', 'ARRI'],
    ['arri', 'ARRI'],
    // GTOT
    ['gate-out', 'GTOT'],
    ['gate out', 'GTOT'],
    ['picked up', 'GTOT'],
    ['delivery', 'GTOT'],
    // RESTOW
    ['restow', 'RESTOW'],
    // AVDO
    ['available for drop-off', 'AVDO'],
    ['available for dropoff', 'AVDO'],
    ['avdo', 'AVDO'],
    // UNKNOWN
    ['something completely unrelated', 'UNKNOWN'],
    ['', 'UNKNOWN'],
  ];

  it.each(cases)('"%s" → %s', (text, expected) => {
    expect(mapStatusTextToDcsa(text)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// 6. DCSA_PHASE — phase assignments for all milestone types
// ---------------------------------------------------------------------------

describe('DCSA_PHASE — correct phase per event type', () => {
  const expectedPhases: Array<[RayaDcsaEventType, string]> = [
    ['RECE', 'outbound'],
    ['GTIN', 'outbound'],
    ['LOAD', 'outbound'],
    ['DEPA', 'ocean'],
    ['ARRI', 'ocean'],
    ['RESTOW', 'ocean'],
    ['DISCH', 'inbound'],
    ['GTOT', 'inbound'],
    ['AVPU', 'other'],
    ['AVDO', 'other'],
    ['UNKNOWN', 'other'],
  ];

  it.each(expectedPhases)('%s is in phase "%s"', (eventType, phase) => {
    expect(DCSA_PHASE[eventType]).toBe(phase);
  });
});

// ---------------------------------------------------------------------------
// 7. Label dictionaries are complete — no event type is missing a label
// ---------------------------------------------------------------------------

describe('DCSA_LABELS_EN / DCSA_LABELS_AR — completeness', () => {
  const allTypes: RayaDcsaEventType[] = [
    'RECE', 'GTIN', 'LOAD', 'DEPA', 'ARRI', 'DISCH', 'GTOT',
    'RESTOW', 'AVPU', 'AVDO', 'UNKNOWN',
  ];

  it.each(allTypes)('%s has a non-empty English label', (eventType) => {
    expect(DCSA_LABELS_EN[eventType]).toBeTruthy();
  });

  it.each(allTypes)('%s has a non-empty Arabic label', (eventType) => {
    expect(DCSA_LABELS_AR[eventType]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 8. Timeline rendering — realistic carrier payload (GTIN → LOAD → DEPA → ARRI → DISCH → GTOT)
//    This is the primary end-to-end smoke test for the milestone sequence.
// ---------------------------------------------------------------------------

describe('Timeline rendering — realistic shipment journey', () => {
  /** Simulated events as they might arrive from a carrier adapter */
  const carrierEvents = [
    { status: 'Gate-in (full)', time: '2024-03-01T08:00:00Z' },
    { status: 'Loaded on vessel', time: '2024-03-02T14:00:00Z' },
    { status: 'Vessel Departed', time: '2024-03-03T06:00:00Z' },
    { status: 'arrived', time: '2024-03-12T10:00:00Z' },
    { status: 'discharged', time: '2024-03-13T09:00:00Z' },
    { status: 'gate-out', time: '2024-03-14T16:00:00Z' },
  ];

  it('renders 6 milestones, one per carrier event', () => {
    const milestones = renderTimeline(carrierEvents.map((e) => e.status));
    expect(milestones).toHaveLength(6);
  });

  it('milestone event types match the canonical sequence', () => {
    const milestones = renderTimeline(carrierEvents.map((e) => e.status));
    expect(milestones.map((m) => m.eventType)).toEqual([
      'GTIN', 'LOAD', 'DEPA', 'ARRI', 'DISCH', 'GTOT',
    ]);
  });

  it('English labels follow the expected milestone sequence', () => {
    const milestones = renderTimeline(carrierEvents.map((e) => e.status));
    expect(milestones.map((m) => m.labelEn)).toEqual([
      DCSA_LABELS_EN.GTIN,
      DCSA_LABELS_EN.LOAD,
      DCSA_LABELS_EN.DEPA,
      DCSA_LABELS_EN.ARRI,
      DCSA_LABELS_EN.DISCH,
      DCSA_LABELS_EN.GTOT,
    ]);
  });

  it('phases progress outbound → ocean → inbound without gaps', () => {
    const milestones = renderTimeline(carrierEvents.map((e) => e.status));
    const phases = milestones.map((m) => m.phase);
    // The journey must start in outbound and end in inbound
    expect(phases[0]).toBe('outbound');
    expect(phases[phases.length - 1]).toBe('inbound');
    // No inbound phase milestone should appear before an ocean milestone
    const firstOcean = phases.indexOf('ocean');
    const firstInbound = phases.indexOf('inbound');
    expect(firstOcean).toBeLessThan(firstInbound);
  });

  it('no milestone in the sequence resolves to UNKNOWN', () => {
    const milestones = renderTimeline(carrierEvents.map((e) => e.status));
    for (const m of milestones) {
      expect(m.eventType, `Unexpected UNKNOWN for label "${m.labelEn}"`).not.toBe('UNKNOWN');
    }
  });
});
