/**
 * Authenticated client for server-side terminal tracking.
 * Provider endpoints and credentials remain on the Node server.
 */
import { apiFetch } from '@/lib/api';
import { normalizeDcsaEvents } from '@/lib/dcsa';
import type { NormalizedDcsaEvent } from '@/lib/dcsaTypes';

export type TrackingProvider = '17track' | 'apm' | 'maersk' | 'aggregator';

export interface TrackingAttempt {
  provider: TrackingProvider;
  label?: string;
  configured: boolean;
  ok: boolean;
  status?: number;
  reason?: string;
  detail?: string;
  eventCount?: number;
  durationMs?: number;
}

interface ServerTrackingResponse {
  ok: boolean;
  error?: string;
  reference: string;
  referenceType: 'container' | 'bill_of_lading';
  live: boolean;
  source: string;
  sourceLabel: string;
  locationCode: string;
  events: unknown[];
  attempts?: TrackingAttempt[];
  n4CapUrl?: string;
  disclaimer: string;
  checkedAt: string;
}

export interface TerminalTrackingResult {
  ok: boolean;
  reference: string;
  referenceType: 'container' | 'bill_of_lading';
  live: boolean;
  source: string;
  sourceLabel: string;
  locationCode: string | null;
  events: NormalizedDcsaEvent[];
  attempts: TrackingAttempt[];
  n4CapUrl?: string;
  disclaimer: string;
  checkedAt: string;
}

async function requestTerminalTracking(
  reference: string,
  token: string,
  preferredProvider?: TrackingProvider,
  carrierId?: string,
): Promise<TerminalTrackingResult> {
  const query = new URLSearchParams({ reference });
  if (preferredProvider) query.set('provider', preferredProvider);
  if (carrierId) query.set('carrier', carrierId);
  const response = await apiFetch<ServerTrackingResponse>(`/tracking/container?${query}`, { token });
  return {
    ok: response.ok,
    reference: response.reference,
    referenceType: response.referenceType,
    live: response.live,
    source: response.source,
    sourceLabel: response.sourceLabel,
    locationCode: response.locationCode || null,
    events: normalizeDcsaEvents(response.events),
    attempts: response.attempts || [],
    n4CapUrl: response.n4CapUrl,
    disclaimer: response.disclaimer,
    checkedAt: response.checkedAt,
  };
}

export function fetch17TrackEvents(reference: string, token: string) {
  return requestTerminalTracking(reference, token, '17track');
}

export function fetchApmTerminalEvents(reference: string, token: string) {
  return requestTerminalTracking(reference, token, 'apm');
}

export function fetchMaerskTracking(reference: string, token: string) {
  return requestTerminalTracking(reference, token, 'maersk');
}

export function fetchAggregatorTracking(reference: string, token: string) {
  return requestTerminalTracking(reference, token, 'aggregator');
}

export function getBestTerminalTracking(
  reference: string,
  options: { token: string; preferredProvider?: TrackingProvider; carrierId?: string },
) {
  return requestTerminalTracking(reference, options.token, options.preferredProvider, options.carrierId);
}
