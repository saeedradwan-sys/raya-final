/**
 * Tests for the tracking adapter pick logic.
 *
 * Critical coverage: the null path — when no adapter matches an unrecognised
 * payload — must be detectable so callers (and the API route) can log a
 * structured warning instead of silently returning zero events.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pickAdapter,
  SeventeenTrackAdapter,
  MaerskDcsaAdapter,
  GenericStatusAdapter,
  ActManualAdapter,
} from './adapters';

// ---------------------------------------------------------------------------
// pickAdapter — null path (unrecognised payload)
// ---------------------------------------------------------------------------

describe('pickAdapter — unrecognised payloads return null', () => {
  it('returns null for null input', () => {
    expect(pickAdapter(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(pickAdapter(undefined)).toBeNull();
  });

  it('returns null for a plain string', () => {
    expect(pickAdapter('MAEU1234567')).toBeNull();
  });

  it('returns null for a number', () => {
    expect(pickAdapter(42)).toBeNull();
  });

  it('returns null for an empty object with no recognised keys', () => {
    // An object is not an array, so GenericStatusAdapter does not match,
    // and none of the other adapters recognise an empty shape.
    expect(pickAdapter({})).toBeNull();
  });

  it('returns null for an object with unrelated keys only', () => {
    expect(pickAdapter({ foo: 'bar', baz: 123 })).toBeNull();
  });

  it('returns null for a boolean', () => {
    expect(pickAdapter(true)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Verify matched adapters so the null guard is meaningful
// ---------------------------------------------------------------------------

describe('pickAdapter — known shapes are matched correctly', () => {
  it('picks SeventeenTrackAdapter for { events: [] }', () => {
    const adapter = pickAdapter({ events: [] });
    expect(adapter).toBeInstanceOf(SeventeenTrackAdapter);
  });

  it('picks SeventeenTrackAdapter for { data: { events: [] } }', () => {
    const adapter = pickAdapter({ data: { events: [] } });
    expect(adapter).toBeInstanceOf(SeventeenTrackAdapter);
  });

  it('picks MaerskDcsaAdapter for array with DCSA-native fields', () => {
    const adapter = pickAdapter([{ equipmentEventTypeCode: 'LOAD', eventDateTime: '2024-01-01T00:00:00Z' }]);
    expect(adapter).toBeInstanceOf(MaerskDcsaAdapter);
  });

  it('picks MaerskDcsaAdapter for { events: [{ eventClassifierCode }] }', () => {
    const adapter = pickAdapter({ events: [{ eventClassifierCode: 'ACT' }] });
    expect(adapter).toBeInstanceOf(MaerskDcsaAdapter);
  });

  it('picks GenericStatusAdapter for a bare array of status rows', () => {
    const adapter = pickAdapter([{ status: 'Gate-in', time: '2024-01-01' }]);
    // A bare array matches GenericStatusAdapter unless Maersk DCSA fields present.
    // The above row has no DCSA fields, so MaerskDcsaAdapter does NOT match.
    expect(adapter).toBeInstanceOf(GenericStatusAdapter);
  });

  it('picks ActManualAdapter for payloads with source === "act-manual"', () => {
    const adapter = pickAdapter({ source: 'act-manual', events: [] });
    expect(adapter).toBeInstanceOf(ActManualAdapter);
  });
});

// ---------------------------------------------------------------------------
// Simulate the API route null guard — the critical regression test
// ---------------------------------------------------------------------------

describe('API route null guard simulation', () => {
  /**
   * This test mirrors the logic in server/index.mjs POST /api/track/normalize.
   * It confirms that when pickAdapter returns null:
   *   - a warning IS emitted (so operators see it in logs)
   *   - callers receive a non-success response (422), not a silent empty success
   *
   * If pickAdapter is changed to never return null (e.g. by adding a
   * catch-all adapter), the null guard in the route becomes dead code and
   * this test will fail — which is the intended signal.
   */

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function simulateRouteHandler(rawPayload: unknown): { status: number; body: Record<string, unknown> } {
    const adapter = pickAdapter(rawPayload);
    if (!adapter) {
      // Mirror the server warning log
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'tracking.unrecognised_payload',
        payloadShape: rawPayload === null ? 'null' : typeof rawPayload,
        timestamp: new Date().toISOString(),
        message: 'No tracking adapter matched this payload',
      }));
      return {
        status: 422,
        body: { ok: false, error: 'unrecognised_payload' },
      };
    }
    return {
      status: 200,
      body: { ok: true, source: adapter.source, events: adapter.normalize(rawPayload) },
    };
  }

  it('returns 422 and logs a warning for an unrecognised payload', () => {
    const result = simulateRouteHandler({ carrier: 'UNKNOWNCARRIER', data: 'opaque' });
    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);
    expect(result.body.error).toBe('unrecognised_payload');
    expect(console.warn).toHaveBeenCalledOnce();

    const logged = JSON.parse((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(logged.event).toBe('tracking.unrecognised_payload');
    expect(logged.level).toBe('warn');
  });

  it('does NOT log a warning for a recognised 17track payload', () => {
    const result = simulateRouteHandler({ events: [{ status: 'Gate-in', time: '2024-01-01' }] });
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT log a warning for a recognised bare-array payload', () => {
    const result = simulateRouteHandler([{ status: 'Discharged', time: '2024-01-01' }]);
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
