/**
 * Tests for tracking adapter normalization.
 *
 * Each test section uses a representative fixture payload that mirrors real
 * carrier / provider data shapes. Assertions cover eventType, classifier,
 * eventTime, locationCode, locationName, vessel, voyage, and source.
 */
import { describe, it, expect } from 'vitest';
import {
  MaerskDcsaAdapter,
  SeventeenTrackAdapter,
  GenericStatusAdapter,
  ActManualAdapter,
  pickAdapter,
} from '../adapters';

// ---------------------------------------------------------------------------
// Maersk / DCSA-native fixtures
// ---------------------------------------------------------------------------
describe('MaerskDcsaAdapter', () => {
  const adapter = new MaerskDcsaAdapter();

  // Representative subset of a real Maersk Track & Trace equipment-event array
  const maerskEventArray = [
    {
      equipmentEventTypeCode: 'LOAD',
      eventClassifierCode: 'ACT',
      eventDateTime: '2024-03-15T06:30:00Z',
      eventLocation: {
        UNLocationCode: 'CNSHA',
        locationName: 'Shanghai',
      },
      transportCall: {
        vessel: { vesselName: 'MAERSK SENTOSA' },
        exportVoyageNumber: '401W',
        carrierVoyageNumber: '401W',
      },
    },
    {
      equipmentEventTypeCode: 'DISCH',
      eventClassifierCode: 'EST',
      eventDateTime: '2024-03-28T14:00:00Z',
      eventLocation: {
        UNLocationCode: 'AEJEA',
        locationName: 'Jebel Ali',
      },
      transportCall: {
        vessel: { vesselName: 'MAERSK SENTOSA' },
        exportVoyageNumber: '401W',
      },
    },
    {
      // DISC is an alias for DISCH in the adapter
      equipmentEventTypeCode: 'DISC',
      eventClassifierCode: 'PLN',
      eventDateTime: '2024-04-01T09:00:00Z',
      eventLocation: { UNLocationCode: 'DEHAM' },
    },
    {
      // RSTW is an alias for RESTOW
      equipmentEventTypeCode: 'RSTW',
      eventClassifierCode: 'ACT',
      eventDateTime: '2024-03-20T11:00:00Z',
    },
    {
      // Wrapped in { events: [...] } object shape
    },
  ];

  const wrappedPayload = { events: maerskEventArray.slice(0, 2) };

  it('matches a bare DCSA event array', () => {
    expect(adapter.matches(maerskEventArray)).toBe(true);
  });

  it('matches a { events: [...] } wrapped DCSA payload', () => {
    expect(adapter.matches(wrappedPayload)).toBe(true);
  });

  it('does not match a plain status array without DCSA fields', () => {
    const plain = [{ status: 'Gate-in', time: '2024-01-01T00:00:00Z' }];
    expect(adapter.matches(plain)).toBe(false);
  });

  describe('LOAD event normalization (bare array)', () => {
    const [event] = adapter.normalize(maerskEventArray);
    it('maps eventType to LOAD', () => expect(event.eventType).toBe('LOAD'));
    it('maps classifier to ACT', () => expect(event.classifier).toBe('ACT'));
    it('preserves ISO eventTime', () =>
      expect(event.eventTime).toBe('2024-03-15T06:30:00.000Z'));
    it('extracts locationCode from eventLocation.UNLocationCode', () =>
      expect(event.locationCode).toBe('CNSHA'));
    it('extracts locationName from eventLocation.locationName', () =>
      expect(event.locationName).toBe('Shanghai'));
    it('extracts vessel name from transportCall.vessel.vesselName', () =>
      expect(event.vessel).toBe('MAERSK SENTOSA'));
    it('extracts voyage from exportVoyageNumber', () =>
      expect(event.voyage).toBe('401W'));
    it('sets source to maersk-dcsa', () =>
      expect(event.source).toBe('maersk-dcsa'));
  });

  describe('DISCH event normalization', () => {
    const events = adapter.normalize(maerskEventArray);
    const event = events[1];
    it('maps eventType to DISCH', () => expect(event.eventType).toBe('DISCH'));
    it('maps classifier to EST', () => expect(event.classifier).toBe('EST'));
    it('extracts locationCode', () => expect(event.locationCode).toBe('AEJEA'));
    it('extracts locationName', () =>
      expect(event.locationName).toBe('Jebel Ali'));
  });

  describe('DISC alias → DISCH', () => {
    const events = adapter.normalize(maerskEventArray);
    const event = events[2];
    it('normalizes DISC to DISCH', () =>
      expect(event.eventType).toBe('DISCH'));
    it('maps classifier to PLN', () => expect(event.classifier).toBe('PLN'));
    it('extracts locationCode with no locationName', () => {
      expect(event.locationCode).toBe('DEHAM');
      expect(event.locationName).toBeNull();
    });
    it('sets vessel/voyage to null when absent', () => {
      expect(event.vessel).toBeNull();
      expect(event.voyage).toBeNull();
    });
  });

  describe('RSTW alias → RESTOW', () => {
    const events = adapter.normalize(maerskEventArray);
    const event = events[3];
    it('normalizes RSTW to RESTOW', () =>
      expect(event.eventType).toBe('RESTOW'));
  });

  describe('wrapped { events: [...] } shape', () => {
    it('normalizes correctly', () => {
      const events = adapter.normalize(wrappedPayload);
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('LOAD');
      expect(events[1].eventType).toBe('DISCH');
    });
  });
});

// ---------------------------------------------------------------------------
// 17TRACK fixtures
// ---------------------------------------------------------------------------
describe('SeventeenTrackAdapter', () => {
  const adapter = new SeventeenTrackAdapter();

  // Flat { events: [...] } shape
  const flatPayload = {
    events: [
      {
        status: 'Gate-in (full)',
        time: '2024-02-10T08:00:00Z',
        location: 'Ningbo',
        locationCode: 'CNNGB',
        vessel: 'MSC ELSA',
        voyage: 'AX410R',
      },
      {
        status: 'Loaded on vessel',
        time: '2024-02-12T14:00:00Z',
        locationName: 'Ningbo Port',
        locationCode: 'CNNGB',
      },
      {
        // description-based status
        description: 'Vessel departed port',
        time: '2024-02-13T02:00:00Z',
      },
      {
        status: 'Discharged',
        date: '2024-03-01',
        locationName: 'Dubai Port',
        locationCode: 'AEDXB',
      },
      {
        status: 'Delivered',
        time: '2024-03-05T10:00:00Z',
      },
    ],
  };

  // Nested { data: { events: [...] } } shape
  const nestedPayload = {
    data: {
      events: [
        {
          status: 'empty released',
          time: '2024-01-20T00:00:00Z',
          location: 'Tianjin',
        },
      ],
    },
  };

  it('matches flat { events } payload', () =>
    expect(adapter.matches(flatPayload)).toBe(true));
  it('matches nested { data: { events } } payload', () =>
    expect(adapter.matches(nestedPayload)).toBe(true));
  it('does not match an unrelated object', () =>
    expect(adapter.matches({ foo: 'bar' })).toBe(false));

  describe('flat events', () => {
    const events = adapter.normalize(flatPayload);

    it('produces the correct number of events', () =>
      expect(events).toHaveLength(5));

    it('GTIN: Gate-in maps correctly', () => {
      expect(events[0].eventType).toBe('GTIN');
      expect(events[0].locationCode).toBe('CNNGB');
      expect(events[0].locationName).toBe('Ningbo');
      expect(events[0].vessel).toBe('MSC ELSA');
      expect(events[0].voyage).toBe('AX410R');
      expect(events[0].source).toBe('17track');
    });

    it('LOAD: Loaded on vessel maps correctly', () => {
      expect(events[1].eventType).toBe('LOAD');
      expect(events[1].locationName).toBe('Ningbo Port');
    });

    it('DEPA: description "Vessel departed port" maps correctly', () => {
      expect(events[2].eventType).toBe('DEPA');
    });

    it('DISCH: Discharged with date field maps correctly', () => {
      expect(events[3].eventType).toBe('DISCH');
      // date-only strings parse to ISO
      expect(events[3].eventTime).toMatch(/^2024-03-01/);
      expect(events[3].locationCode).toBe('AEDXB');
    });

    it('UNKNOWN: Delivered has no matching DCSA code', () => {
      expect(events[4].eventType).toBe('UNKNOWN');
    });

    it('classifier is null when absent', () => {
      expect(events[0].classifier).toBeNull();
    });
  });

  describe('nested data.events shape', () => {
    const events = adapter.normalize(nestedPayload);
    it('normalizes nested shape', () => {
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('RECE');
      expect(events[0].locationName).toBe('Tianjin');
    });
  });
});

// ---------------------------------------------------------------------------
// GenericStatusAdapter fixtures
// ---------------------------------------------------------------------------
describe('GenericStatusAdapter', () => {
  const adapter = new GenericStatusAdapter();

  const payload: Array<Record<string, string>> = [
    {
      status: 'Vessel arrived',
      time: '2024-04-05T06:00:00Z',
      locationName: 'Hamburg',
      locationCode: 'DEHAM',
    },
    {
      eventType: 'Gate-out',
      eventTime: '2024-04-06T10:00:00Z',
      locationName: 'Hamburg CTA',
    },
    {
      status: 'available for pickup',
      time: '2024-04-07T08:00:00Z',
    },
    {
      status: 'available for drop-off',
      time: '2024-04-08T08:00:00Z',
    },
    {
      status: 'restow',
      time: '2024-04-09T08:00:00Z',
    },
    {
      status: 'on board',
      time: '2024-04-04T00:00:00Z',
    },
  ];

  it('matches an array payload', () =>
    expect(adapter.matches(payload)).toBe(true));
  it('does not match a non-array', () =>
    expect(adapter.matches({ events: [] })).toBe(false));

  describe('event normalization', () => {
    const events = adapter.normalize(payload);
    it('ARRI: Vessel arrived', () =>
      expect(events[0].eventType).toBe('ARRI'));
    it('GTOT: Gate-out via eventType field', () =>
      expect(events[1].eventType).toBe('GTOT'));
    it('AVPU: available for pickup', () =>
      expect(events[2].eventType).toBe('AVPU'));
    it('AVDO: available for drop-off', () =>
      expect(events[3].eventType).toBe('AVDO'));
    it('RESTOW: restow', () =>
      expect(events[4].eventType).toBe('RESTOW'));
    it('LOAD: on board maps to LOAD', () =>
      expect(events[5].eventType).toBe('LOAD'));
    it('preserves locationCode', () =>
      expect(events[0].locationCode).toBe('DEHAM'));
    it('sets source to generic', () =>
      expect(events[0].source).toBe('generic'));
  });
});

// ---------------------------------------------------------------------------
// ActManualAdapter fixtures
// ---------------------------------------------------------------------------
describe('ActManualAdapter', () => {
  const adapter = new ActManualAdapter();

  const payload = {
    source: 'act-manual',
    events: [
      {
        status: 'Gate-in (full)',
        classifier: 'ACT',
        eventTime: '2024-05-01T07:00:00Z',
        locationCode: 'JOAQJ',
        locationName: 'Aqaba',
      },
      {
        status: 'Discharged',
        classifier: 'ACT',
        eventTime: '2024-05-03T12:00:00Z',
        locationCode: 'JOAQJ',
        vessel: 'RAYAN',
        voyage: 'V001',
      },
    ],
  };

  it('matches { source: "act-manual" } payload', () =>
    expect(adapter.matches(payload)).toBe(true));
  it('does not match other sources', () =>
    expect(adapter.matches({ source: 'maersk', events: [] })).toBe(false));
  it('does not match null', () =>
    expect(adapter.matches(null)).toBe(false));

  describe('event normalization', () => {
    const events = adapter.normalize(payload);
    it('produces correct number of events', () =>
      expect(events).toHaveLength(2));
    it('GTIN: Gate-in', () =>
      expect(events[0].eventType).toBe('GTIN'));
    it('maps ACT classifier', () =>
      expect(events[0].classifier).toBe('ACT'));
    it('preserves locationCode', () =>
      expect(events[0].locationCode).toBe('JOAQJ'));
    it('preserves locationName', () =>
      expect(events[0].locationName).toBe('Aqaba'));
    it('DISCH: Discharged', () =>
      expect(events[1].eventType).toBe('DISCH'));
    it('preserves vessel', () =>
      expect(events[1].vessel).toBe('RAYAN'));
    it('preserves voyage', () =>
      expect(events[1].voyage).toBe('V001'));
    it('sets source to act-manual', () =>
      expect(events[0].source).toBe('act-manual'));
  });
});

// ---------------------------------------------------------------------------
// pickAdapter — adapter selection
// ---------------------------------------------------------------------------
describe('pickAdapter', () => {
  it('prefers ActManualAdapter for act-manual payloads', () => {
    const payload = { source: 'act-manual', events: [] };
    expect(pickAdapter(payload)?.source).toBe('act-manual');
  });

  it('picks MaerskDcsaAdapter for DCSA event arrays', () => {
    const payload = [{ equipmentEventTypeCode: 'LOAD', eventClassifierCode: 'ACT' }];
    expect(pickAdapter(payload)?.source).toBe('maersk-dcsa');
  });

  it('picks MaerskDcsaAdapter for wrapped DCSA payload', () => {
    const payload = { events: [{ eventDateTime: '2024-01-01T00:00:00Z' }] };
    expect(pickAdapter(payload)?.source).toBe('maersk-dcsa');
  });

  it('picks SeventeenTrackAdapter for flat { events } payload', () => {
    // No DCSA fields — pure status strings only
    const payload = { events: [{ status: 'Gate-in', time: '2024-01-01T00:00:00Z' }] };
    expect(pickAdapter(payload)?.source).toBe('17track');
  });

  it('picks SeventeenTrackAdapter for nested data.events payload', () => {
    const payload = { data: { events: [{ status: 'Gate-in' }] } };
    expect(pickAdapter(payload)?.source).toBe('17track');
  });

  it('picks GenericStatusAdapter for a plain status array', () => {
    const payload = [{ status: 'Gate-in', time: '2024-01-01T00:00:00Z' }];
    expect(pickAdapter(payload)?.source).toBe('generic');
  });

  it('returns null for an unrecognised payload', () => {
    expect(pickAdapter({ foo: 'bar' })).toBeNull();
  });

  it('returns null for null', () => {
    expect(pickAdapter(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
  const maerskAdapter = new MaerskDcsaAdapter();
  const genericAdapter = new GenericStatusAdapter();

  it('handles unknown DCSA code gracefully as UNKNOWN', () => {
    const payload = [{ equipmentEventTypeCode: 'ZZZZ', eventClassifierCode: 'ACT' }];
    const [event] = maerskAdapter.normalize(payload);
    expect(event.eventType).toBe('UNKNOWN');
  });

  it('handles invalid date strings by preserving raw string', () => {
    const payload = [{ status: 'Gate-in', time: 'not-a-date' }];
    const [event] = genericAdapter.normalize(payload);
    expect(event.eventTime).toBe('not-a-date');
  });

  it('falls back to carrierVoyageNumber when exportVoyageNumber absent', () => {
    const payload = [
      {
        equipmentEventTypeCode: 'DEPA',
        eventClassifierCode: 'ACT',
        eventDateTime: '2024-03-01T00:00:00Z',
        transportCall: {
          vessel: { vesselName: 'EVER GIVEN' },
          carrierVoyageNumber: 'B10W',
        },
      },
    ];
    const [event] = maerskAdapter.normalize(payload);
    expect(event.voyage).toBe('B10W');
  });

  it('rawPayload is preserved on every event', () => {
    const raw = { status: 'Loaded', time: '2024-01-01T00:00:00Z' };
    const [event] = genericAdapter.normalize([raw]);
    expect(event.rawPayload).toBe(raw);
  });

  it('empty events array returns empty array', () => {
    expect(maerskAdapter.normalize({ events: [] })).toEqual([]);
    expect(genericAdapter.normalize([])).toEqual([]);
  });
});
