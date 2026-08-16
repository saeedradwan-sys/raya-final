/**
 * Integration tests for the unrecognised-payload detection in terminalTracking.mjs.
 *
 * These tests exercise the real provider-response path (requestProvider /
 * requestApm / request17Track) through getBestTerminalTracking so that carrier
 * format changes cannot silently drop events without producing a diagnostic signal.
 *
 * Because PROVIDERS[] is initialised at module load time from process.env,
 * each describe block uses vi.resetModules() + dynamic import to force a clean
 * module evaluation with the stubbed env.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GetBestTerminalTracking = (
  reference: string,
  provider?: string,
  carrier?: string,
) => Promise<{
  ok: boolean;
  reference?: string;
  events?: unknown[];
  attempts?: Array<{
    provider: string;
    ok: boolean;
    reason?: string;
    payloadShape?: string;
  }>;
  error?: string;
}>;

async function loadTerminalTracking(): Promise<{ getBestTerminalTracking: GetBestTerminalTracking }> {
  // @ts-ignore — intentional cross-boundary import of server ESM from test;
  // the module has no TypeScript declarations and lives outside src/.
  return import('../../../../server/terminalTracking.mjs') as Promise<{
    getBestTerminalTracking: GetBestTerminalTracking;
  }>;
}

/** Replace global fetch with a one-shot mock that returns the given body. */
function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

// ---------------------------------------------------------------------------
// Generic provider path (Maersk / aggregator) via requestProvider
// ---------------------------------------------------------------------------

describe('requestProvider — structural format change detection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('RAYA_MAERSK_TRACKING_URL', 'https://maersk.example.com/track');
    vi.stubEnv('RAYA_MAERSK_CONSUMER_KEY', 'test-consumer-key');
    vi.stubEnv('RAYA_17TRACK_TOKEN', '');
    vi.stubEnv('RAYA_APM_TRACKING_URL', '');
    vi.stubEnv('RAYA_APM_TRACKING_API_KEY', '');
    vi.stubEnv('RAYA_APM_CLIENT_ID', '');
    vi.stubEnv('RAYA_APM_CLIENT_SECRET', '');
    vi.stubEnv('RAYA_TRACKING_AGGREGATOR_URL', '');
    vi.stubEnv('RAYA_TRACKING_AGGREGATOR_KEY', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('logs a structured warning and sets unrecognised_format when the carrier changes its top-level shape', async () => {
    // Carrier moved events to "containerMilestones" — extractEvents cannot find it.
    mockFetchOnce(200, {
      containerMilestones: [
        { stage: 'Gate-in', ts: '2024-06-01T08:00:00Z', loc: 'JOAQJ' },
      ],
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');

    const attempt = result.attempts?.find((a) => a.provider === 'maersk');
    expect(attempt?.ok).toBe(false);
    expect(attempt?.reason).toBe('unrecognised_format');

    expect(console.warn).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    );
    expect(logged.event).toBe('tracking.unrecognised_payload');
    expect(logged.level).toBe('warn');
    expect(logged.provider).toBe('maersk');
    expect(logged.reference).toBe('MSCU1234567');
    expect(logged.payloadShape).toContain('Object');
    expect(logged.timestamp).toBeTruthy();
  });

  it('does NOT warn and returns no_events for a genuinely empty response { }', async () => {
    mockFetchOnce(200, {});
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    const attempt = result.attempts?.find((a) => a.provider === 'maersk');
    expect(attempt?.reason).toBe('no_events');
    expect(console.warn).not.toHaveBeenCalled();
  });

  // ------ Regression: recognised empty-event envelopes must NOT warn ------

  it('does NOT warn for { events: [] } — recognised container, legitimately empty', async () => {
    mockFetchOnce(200, { events: [] });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    const attempt = result.attempts?.find((a) => a.provider === 'maersk');
    expect(attempt?.reason).toBe('no_events');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for { milestones: [] } — recognised container, legitimately empty', async () => {
    mockFetchOnce(200, { milestones: [] });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    const attempt = result.attempts?.find((a) => a.provider === 'maersk');
    expect(attempt?.reason).toBe('no_events');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for nested { data: { events: [] } } — recognised container, legitimately empty', async () => {
    mockFetchOnce(200, { data: { events: [] } });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    const attempt = result.attempts?.find((a) => a.provider === 'maersk');
    expect(attempt?.reason).toBe('no_events');
    expect(console.warn).not.toHaveBeenCalled();
  });

  // ------ Recognised non-empty envelopes ------

  it('does NOT warn for a recognised { events: [...] } envelope', async () => {
    mockFetchOnce(200, {
      events: [{ status: 'Gate-in (full)', time: '2024-06-01T08:00:00Z', locationCode: 'JOAQJ' }],
    });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for a recognised { milestones: [...] } envelope (legacy shape)', async () => {
    mockFetchOnce(200, {
      milestones: [
        { eventType: 'GTIN', eventDateTime: '2024-06-01T06:00:00Z', locationCode: 'JOAQJ' },
      ],
    });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for nested { data: { events: [...] } } (legacy shape)', async () => {
    mockFetchOnce(200, {
      data: { events: [{ equipmentEventTypeCode: 'LOAD', eventDateTime: '2024-06-03T12:00:00Z' }] },
    });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for a recognised bare-array envelope', async () => {
    mockFetchOnce(200, [{ status: 'Loaded on vessel', time: '2024-06-02T10:00:00Z' }]);
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'maersk');
    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns when an unrecognised key wraps non-empty event data (structural change)', async () => {
    // e.g. carrier renamed their top-level key from "events" to "trackingEvents"
    mockFetchOnce(200, {
      trackingEvents: [
        { milestone: 'DEPARTURE', time: '2024-06-04T08:00:00Z' },
        { milestone: 'ARRIVAL', time: '2024-06-05T09:00:00Z' },
      ],
    });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    await getBestTerminalTracking('MSCU1234567', 'maersk');
    expect(console.warn).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    );
    expect(logged.event).toBe('tracking.unrecognised_payload');
    // payloadShape must name the shape for diagnostics; must NOT leak event data
    expect(logged.payloadShape).not.toContain('DEPARTURE');
    expect(logged.payloadShape).not.toContain('ARRIVAL');
  });
});

// ---------------------------------------------------------------------------
// APM provider path (requestApm) — requires OAuth credentials
//
// requestProvider routes to requestApm only when BOTH clientId AND clientSecret
// are set. With a static key also set, getApmAccessToken uses the key directly
// and no OAuth token endpoint call is made.
// ---------------------------------------------------------------------------

describe('requestApm — structural format change detection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('RAYA_APM_TRACKING_URL', 'https://apm.example.com/container-event-history');
    vi.stubEnv('RAYA_APM_TRACKING_API_KEY', 'static-apm-key');
    vi.stubEnv('RAYA_APM_CLIENT_ID', 'test-client-id');
    vi.stubEnv('RAYA_APM_CLIENT_SECRET', 'test-client-secret');
    vi.stubEnv('RAYA_17TRACK_TOKEN', '');
    vi.stubEnv('RAYA_MAERSK_TRACKING_URL', '');
    vi.stubEnv('RAYA_MAERSK_CONSUMER_KEY', '');
    vi.stubEnv('RAYA_TRACKING_AGGREGATOR_URL', '');
    vi.stubEnv('RAYA_TRACKING_AGGREGATOR_KEY', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('logs a structured warning when APM response has an unrecognised top-level shape', async () => {
    mockFetchOnce(200, {
      portMilestones: [{ mType: 'DISCHARGE', mTime: '2024-07-01T06:00:00Z' }],
      facilityCode: 'JOAQJ',
    });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'apm');
    const attempt = result.attempts?.find((a) => a.provider === 'apm');
    expect(attempt?.ok).toBe(false);
    expect(attempt?.reason).toBe('unrecognised_format');
    expect(console.warn).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    );
    expect(logged.event).toBe('tracking.unrecognised_payload');
    expect(logged.provider).toBe('apm');
    expect(logged.reference).toBe('MSCU1234567');
  });

  it('does NOT warn for an empty APM response', async () => {
    mockFetchOnce(200, {});
    const { getBestTerminalTracking } = await loadTerminalTracking();
    await getBestTerminalTracking('MSCU1234567', 'apm');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for APM { events: [] } — recognised empty container', async () => {
    mockFetchOnce(200, { events: [] });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'apm');
    const attempt = result.attempts?.find((a) => a.provider === 'apm');
    expect(attempt?.reason).toBe('no_events');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('extracts events from { events: [...] } shape without warning', async () => {
    mockFetchOnce(200, {
      events: [{ equipmentEventTypeCode: 'DISCH', eventDateTime: '2024-07-02T06:00:00Z', eventClassifierCode: 'ACT' }],
    });
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'apm');
    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('extracts events from a bare-array APM response without warning', async () => {
    mockFetchOnce(200, [{ equipmentEventTypeCode: 'LOAD', eventDateTime: '2024-07-01T08:00:00Z' }]);
    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', 'apm');
    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 17TRACK provider path — structural format change detection
//
// 17TRACK uses a proprietary nested schema:
//   { code: 0, data: { accepted: [{ track_info: { tracking: { providers: [...] } } }] } }
// A structural change is detected when code === 0 AND data.accepted exists
// BUT track_info.tracking.providers is absent or not an array.
// ---------------------------------------------------------------------------

describe('request17Track — structural format change detection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('RAYA_17TRACK_TOKEN', 'test-17track-token');
    vi.stubEnv('RAYA_APM_TRACKING_URL', '');
    vi.stubEnv('RAYA_APM_TRACKING_API_KEY', '');
    vi.stubEnv('RAYA_APM_CLIENT_ID', '');
    vi.stubEnv('RAYA_APM_CLIENT_SECRET', '');
    vi.stubEnv('RAYA_MAERSK_TRACKING_URL', '');
    vi.stubEnv('RAYA_MAERSK_CONSUMER_KEY', '');
    vi.stubEnv('RAYA_TRACKING_AGGREGATOR_URL', '');
    vi.stubEnv('RAYA_TRACKING_AGGREGATOR_KEY', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('logs a structured warning when track_info.tracking.providers is absent (format changed)', async () => {
    mockFetchOnce(200, {
      code: 0,
      data: {
        accepted: [{
          number: 'MSCU1234567',
          track_info: {
            milestones: [{ stage: 'Gate-in', time_utc: '2024-06-01T06:00:00Z' }],
          },
        }],
        rejected: [],
      },
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', '17track');

    const attempt = result.attempts?.find((a) => a.provider === '17track');
    expect(attempt?.ok).toBe(false);
    expect(attempt?.reason).toBe('unrecognised_format');

    expect(console.warn).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    );
    expect(logged.event).toBe('tracking.unrecognised_payload');
    expect(logged.level).toBe('warn');
    expect(logged.provider).toBe('17track');
    expect(logged.reference).toBe('MSCU1234567');
    expect(logged.timestamp).toBeTruthy();
  });

  it('logs a structured warning when track_info is entirely absent from accepted item', async () => {
    mockFetchOnce(200, {
      code: 0,
      data: {
        accepted: [{
          number: 'MSCU1234567',
          trackingData: { events: [{ stage: 'Loaded', time: '2024-06-02T09:00:00Z' }] },
        }],
        rejected: [],
      },
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', '17track');

    const attempt = result.attempts?.find((a) => a.provider === '17track');
    expect(attempt?.reason).toBe('unrecognised_format');
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('logs a structured warning when data.accepted is absent and data has non-rejection content', async () => {
    // 17TRACK renamed "accepted" to "results" — accepted is not an array.
    mockFetchOnce(200, {
      code: 0,
      data: {
        results: [{ number: 'MSCU1234567', track_info: { tracking: { providers: [] } } }],
      },
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', '17track');

    const attempt = result.attempts?.find((a) => a.provider === '17track');
    expect(attempt?.ok).toBe(false);
    expect(attempt?.reason).toBe('unrecognised_format');
    expect(console.warn).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    );
    expect(logged.event).toBe('tracking.unrecognised_payload');
    expect(logged.provider).toBe('17track');
  });

  it('does NOT warn for a rejection-only response (data.rejected has items, no accepted)', async () => {
    // Legitimate: 17TRACK rejected the container reference.
    mockFetchOnce(200, {
      code: 0,
      data: {
        rejected: [{ number: 'MSCU1234567', error: { code: 3001, message: 'No carrier found' } }],
      },
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', '17track');

    // Should return provider_rejected without a warning (legitimate rejection).
    const attempt = result.attempts?.find((a) => a.provider === '17track');
    expect(attempt?.ok).toBe(false);
    expect(attempt?.reason).not.toBe('unrecognised_format');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn when data.accepted has the standard providers array (legitimately empty)', async () => {
    // providers is [] — structure intact, just no events yet.
    mockFetchOnce(200, {
      code: 0,
      data: {
        accepted: [{
          number: 'MSCU1234567',
          track_info: { tracking: { providers: [] } },
        }],
        rejected: [],
      },
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', '17track');

    const attempt = result.attempts?.find((a) => a.provider === '17track');
    expect(attempt?.reason).toBe('no_events');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does NOT warn for a normal 17TRACK response with events', async () => {
    mockFetchOnce(200, {
      code: 0,
      data: {
        accepted: [{
          number: 'MSCU1234567',
          track_info: {
            tracking: {
              providers: [{
                events: [
                  { stage: 'Loaded on board', time_utc: '2024-06-02T10:00:00Z', location: 'Aqaba' },
                ],
              }],
            },
          },
        }],
        rejected: [],
      },
    });

    const { getBestTerminalTracking } = await loadTerminalTracking();
    const result = await getBestTerminalTracking('MSCU1234567', '17track');

    expect(result.ok).toBe(true);
    expect((result.events ?? []).length).toBeGreaterThan(0);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
