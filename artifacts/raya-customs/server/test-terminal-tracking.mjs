import assert from 'node:assert/strict';

process.env.RAYA_17TRACK_TOKEN = 'test-token-never-log';
process.env.RAYA_APM_TRACKING_URL = '';
process.env.RAYA_APM_TRACKING_API_KEY = '';
process.env.RAYA_APM_CLIENT_ID = '';
process.env.RAYA_APM_CLIENT_SECRET = '';
process.env.RAYA_MAERSK_TRACKING_URL = '';
process.env.RAYA_MAERSK_CONSUMER_KEY = '';
process.env.RAYA_TRACKING_AGGREGATOR_URL = '';
process.env.RAYA_TRACKING_AGGREGATOR_KEY = '';

let responsePayload;
let capturedRequest;
globalThis.fetch = async (url, options) => {
  capturedRequest = { url: String(url), options };
  return {
    ok: true,
    status: 200,
    json: async () => responsePayload,
  };
};

const { getBestTerminalTracking, trackingProviderInfo } = await import('./terminalTracking.mjs?terminal-test');

assert.equal(trackingProviderInfo().providers['17track'], true);

responsePayload = {
  code: 0,
  data: {
    accepted: [{
      track_info: {
        tracking: {
          providers: [{
            events: [
              { stage: 'Departure', time_utc: '2026-08-01T09:00:00Z', location: 'Ningbo' },
              { stage: 'Delivered', time_utc: '2026-08-01T10:00:00Z', location: 'Aqaba' },
              { stage: 'Departure', time_utc: '2026-08-01T09:00:00Z', location: 'Ningbo' },
            ],
          }],
        },
      },
    }],
    rejected: [],
  },
};

const tracked = await getBestTerminalTracking('ecmu5691535', '17track', 'cma');
assert.equal(tracked.ok, true);
assert.equal(tracked.live, true);
assert.equal(tracked.source, '17track');
assert.equal(tracked.events.length, 2, 'duplicate provider events should be removed');
assert.equal(tracked.events[0].eventType, 'DEPA');
assert.equal(tracked.events[1].eventType, 'UNKNOWN', 'delivery must not imply ACT gate-out');
assert.match(tracked.disclaimer, /ACT N4 CAP and Customs records remain authoritative/i);
assert.equal(tracked.referenceType, 'container');
assert.equal(tracked.events[0].sourceProvider, '17track');
assert.equal(tracked.attempts[0].configured, true);
assert.equal(tracked.attempts[0].eventCount, 2);
assert.match(tracked.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
assert.equal(capturedRequest.url, 'https://api.17track.net/track/v2.4/getRealTimeTrackInfo');
assert.equal(capturedRequest.options.method, 'POST');
assert.equal(capturedRequest.options.headers['17token'], 'test-token-never-log');
assert.deepEqual(JSON.parse(capturedRequest.options.body), [{
  number: 'ECMU5691535',
  lang: 'en',
  cacheLevel: 0,
  carrier: 100755,
}]);

responsePayload = {
  code: 0,
  data: {
    accepted: [],
    rejected: [{ number: 'MSCU1234567', error: { code: -18019903, message: 'Carrier cannot be detected.' } }],
  },
};

const rejected = await getBestTerminalTracking('MSCU1234567', '17track');
assert.equal(rejected.ok, true);
assert.equal(rejected.live, false);
assert.equal(rejected.source, 'manual_act');
assert.equal(rejected.attempts[0].reason, 'provider_rejected_-18019903');
assert.equal(rejected.attempts[0].detail, 'Carrier cannot be detected.');
assert.doesNotMatch(JSON.stringify(rejected), /test-token-never-log/);

responsePayload = {
  code: 0,
  data: {
    accepted: [{
      track_info: {
        tracking: {
          providers: [{
            latest_sync_status: 'Success',
            provider_tips: 'Carrier accepted the reference but has no milestones yet.',
            events: [],
          }],
        },
      },
    }],
    rejected: [],
  },
};

const acceptedWithoutEvents = await getBestTerminalTracking('CAIU9089855', '17track', 'cma');
assert.equal(acceptedWithoutEvents.live, false);
assert.equal(acceptedWithoutEvents.attempts[0].reason, 'no_events');
assert.equal(acceptedWithoutEvents.attempts[0].detail, 'Carrier accepted the reference but has no milestones yet.');

const invalid = await getBestTerminalTracking('<script>', '17track');
assert.deepEqual(invalid, { ok: false, error: 'invalid_reference' });

process.env.RAYA_17TRACK_TOKEN = '';
process.env.RAYA_APM_CLIENT_ID = 'apm-test-client';
process.env.RAYA_APM_CLIENT_SECRET = 'apm-test-secret';
process.env.RAYA_APM_TRACKING_URL = 'https://api.apmterminals.com/container-event-history';
let apmRequestCount = 0;
globalThis.fetch = async (url, options) => {
  apmRequestCount += 1;
  const requestUrl = String(url);
  if (requestUrl.includes('/oauth/client_credential/accesstoken')) {
    assert.equal(options.method, 'POST');
    assert.match(options.body, /client_id=apm-test-client/);
    assert.match(options.body, /client_secret=apm-test-secret/);
    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'apm-access-token-never-log', expires_in: 1800 }),
    };
  }
  assert.equal(options.method, 'GET');
  assert.equal(options.headers.Authorization, 'Bearer apm-access-token-never-log');
  const parsed = new URL(requestUrl);
  assert.equal(parsed.searchParams.get('assetId'), 'MSCU1234567');
  assert.equal(parsed.searchParams.get('facilityCode'), 'JOAQJ');
  return {
    ok: true,
    status: 200,
    json: async () => ({
      events: [{
        equipmentEventTypeCode: 'DISCH',
        eventClassifierCode: 'ACT',
        eventDateTime: '2026-08-02T08:00:00Z',
        equipmentReference: 'MSCU1234567',
        eventLocation: { UNLocationCode: 'JOAQJ', locationName: 'Aqaba Container Terminal' },
      }],
    }),
  };
};

const apmModule = await import('./terminalTracking.mjs?apm-oauth-test');
assert.equal(apmModule.trackingProviderInfo().providers.apm, true);
const apmTracked = await apmModule.getBestTerminalTracking('MSCU1234567', 'apm');
assert.equal(apmTracked.ok, true);
assert.equal(apmTracked.live, true);
assert.equal(apmTracked.source, 'apm');
assert.equal(apmTracked.sourceLabel, 'APM Terminals Aqaba');
assert.equal(apmTracked.events[0].eventLocation.UNLocationCode, 'JOAQJ');
assert.equal(apmTracked.events[0].sourceProvider, 'apm');
assert.equal(apmRequestCount, 2, 'APM OAuth and event-history requests should both run');
assert.doesNotMatch(JSON.stringify(apmTracked), /apm-(test|access)-/);

const blTracked = await apmModule.getBestTerminalTracking('COSU9508482010', 'apm');
assert.equal(blTracked.live, false);
assert.equal(blTracked.referenceType, 'bill_of_lading');
assert.equal(blTracked.attempts[0].reason, 'container_required');
assert.equal(apmRequestCount, 2, 'B/L references must not be sent to the APM container endpoint');

process.env.RAYA_17TRACK_TOKEN = 'combined-17-token';
let combinedRequestCount = 0;
globalThis.fetch = async (url, options) => {
  combinedRequestCount += 1;
  const requestUrl = String(url);
  if (requestUrl.includes('/oauth/client_credential/accesstoken')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'combined-apm-token', expires_in: 1800 }),
    };
  }
  if (requestUrl.includes('api.17track.net')) {
    assert.equal(options.headers['17token'], 'combined-17-token');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        data: {
          accepted: [{
            track_info: {
              tracking: {
                providers: [{
                  events: [{ stage: 'Departure', time_utc: '2026-08-01T09:00:00Z', location: 'Ningbo' }],
                }],
              },
            },
          }],
          rejected: [],
        },
      }),
    };
  }
  assert.equal(options.headers.Authorization, 'Bearer combined-apm-token');
  return {
    ok: true,
    status: 200,
    json: async () => ({
      events: [{
        equipmentEventTypeCode: 'DISCH',
        eventClassifierCode: 'ACT',
        eventDateTime: '2026-08-02T08:00:00Z',
        equipmentReference: 'MSCU1234567',
        eventLocation: { UNLocationCode: 'JOAQJ', locationName: 'Aqaba Container Terminal' },
      }],
    }),
  };
};

const combinedModule = await import('./terminalTracking.mjs?combined-provider-test');
const combined = await combinedModule.getBestTerminalTracking('MSCU1234567');
assert.equal(combined.live, true);
assert.equal(combined.source, 'combined');
assert.match(combined.sourceLabel, /17TRACK/);
assert.match(combined.sourceLabel, /APM Terminals Aqaba/);
assert.equal(combined.events.length, 2);
assert.deepEqual(combined.events.map((event) => event.sourceProvider), ['17track', 'apm']);
assert.equal(combinedRequestCount, 3, 'carrier, OAuth and terminal requests should run');
assert.doesNotMatch(JSON.stringify(combined), /combined-(17|apm)-token/);
console.log('terminal tracking integration tests passed');
