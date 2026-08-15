/**
 * Client helpers for Tracking Phase 1 API.
 */

import type { NormalizedTrackingEvent } from './dcsaEventMap';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

export interface TrackApiShipment {
  containerNumber: string;
  blNumber?: string | null;
  bookingNumber?: string | null;
  pol?: string | null;
  pod?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  currentStatus?: string | null;
  lastSyncAt?: string | null;
}

export interface TrackApiResult {
  ok: boolean;
  containerNumber?: string;
  iso6346?: boolean;
  shipment?: TrackApiShipment;
  events?: Array<NormalizedTrackingEvent & { id?: string }>;
  inserted?: number;
  skipped?: number;
  error?: string;
  count?: number;
  source?: string;
  disclaimer?: string;
}

async function parseJson(res: Response): Promise<TrackApiResult> {
  try {
    return (await res.json()) as TrackApiResult;
  } catch {
    return { ok: false, error: `http_${res.status}` };
  }
}

export async function normalizeTrackingPayload(
  payload: unknown,
  source = 'generic',
): Promise<TrackApiResult> {
  const res = await fetch(`${API_BASE}/track/normalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, source }),
  });
  return parseJson(res);
}

export async function upsertTrackingEvents(input: {
  containerNumber: string;
  source?: string;
  blNumber?: string;
  status?: string;
  eventTime?: string;
  locationCode?: string;
  vessel?: string;
  voyage?: string;
  payload?: unknown;
  events?: unknown[];
  accessToken?: string | null;
}): Promise<TrackApiResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`;

  const res = await fetch(`${API_BASE}/track/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function fetchContainerTracking(containerNumber: string): Promise<TrackApiResult> {
  const res = await fetch(`${API_BASE}/track/${encodeURIComponent(containerNumber)}`);
  return parseJson(res);
}

export async function listTrackedContainers(): Promise<{ ok: boolean; items?: unknown[]; error?: string }> {
  const res = await fetch(`${API_BASE}/track/list`);
  try {
    return await res.json();
  } catch {
    return { ok: false, error: `http_${res.status}` };
  }
}
