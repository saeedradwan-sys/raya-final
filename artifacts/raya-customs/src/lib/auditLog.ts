/**
 * Audit trail: always writes local sessionStorage (demo UX).
 * When staff JWT is present and API is up, also persists server-side (append-only JSONL).
 */

import { apiFetch, apiHealth } from '@/lib/api';

export type AuditActor = 'portal' | 'staff' | 'system';

export interface AuditEvent {
  id: string;
  at: string;
  actor: AuditActor;
  action: string;
  detailEn: string;
  detailAr: string;
  meta?: Record<string, string>;
  /** true when confirmed stored on server */
  serverPersisted?: boolean;
  actorId?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
}

const KEY = 'raya-audit-log';
const MAX = 200;

function load(): AuditEvent[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(events: AuditEvent[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX)));
  } catch {
    /* private mode */
  }
}

function readStaffAccessToken(): string | null {
  try {
    const raw = sessionStorage.getItem('raya-staff-session');
    if (!raw) return null;
    const s = JSON.parse(raw) as {
      accessToken?: string;
      serverValidated?: boolean;
    };
    if (s.serverValidated && s.accessToken) return s.accessToken;
  } catch {
    /* */
  }
  return null;
}

function toClientEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id || `aud-${Date.now()}`),
    at: String(row.at || new Date().toISOString()),
    actor: (row.actorType as AuditActor) || (row.actor as AuditActor) || 'system',
    action: String(row.action || ''),
    detailEn: String(row.detailEn || ''),
    detailAr: String(row.detailAr || row.detailEn || ''),
    meta: row.meta && typeof row.meta === 'object' ? (row.meta as Record<string, string>) : undefined,
    serverPersisted: true,
    actorId: row.actorId ? String(row.actorId) : undefined,
    actorRole: row.actorRole ? String(row.actorRole) : undefined,
    entityType: row.entityType ? String(row.entityType) : undefined,
    entityId: row.entityId ? String(row.entityId) : undefined,
  };
}

/** Local + optional server dual-write (fire-and-forget to API). */
export function appendAudit(
  actor: AuditActor,
  action: string,
  detailEn: string,
  detailAr: string,
  meta?: Record<string, string>,
): void {
  const event: AuditEvent = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actor,
    action,
    detailEn,
    detailAr,
    meta,
    serverPersisted: false,
  };
  const events = load();
  events.unshift(event);
  save(events);

  const token = readStaffAccessToken();
  if (token && actor === 'staff') {
    void persistToServer(token, event);
  }
}

async function persistToServer(token: string, event: AuditEvent): Promise<void> {
  try {
    const online = await apiHealth();
    if (!online) return;
    await apiFetch<{ ok: boolean; event: Record<string, unknown> }>('/audit', {
      method: 'POST',
      token,
      body: JSON.stringify({
        action: event.action,
        detailEn: event.detailEn,
        detailAr: event.detailAr,
        meta: event.meta,
        entityType: event.meta?.entityType,
        entityId: event.meta?.entityId,
      }),
    });
    // mark local copy
    const events = load();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = { ...events[idx], serverPersisted: true };
      save(events);
    }
  } catch {
    /* keep local-only */
  }
}

export function listAudit(limit = 50): AuditEvent[] {
  return load().slice(0, limit);
}

/** Prefer server trail when JWT allows audit:read; merge with local. */
export async function listAuditMerged(limit = 50): Promise<{
  events: AuditEvent[];
  source: 'server' | 'local' | 'merged';
  stats?: { totalLines: number };
}> {
  const local = listAudit(limit);
  const token = readStaffAccessToken();
  if (!token) {
    return { events: local, source: 'local' };
  }
  try {
    const online = await apiHealth();
    if (!online) return { events: local, source: 'local' };
    const res = await apiFetch<{
      events: Record<string, unknown>[];
      stats?: { totalLines: number };
    }>(`/audit?limit=${limit}`, { token });
    const serverEvents = (res.events || []).map(toClientEvent);
    // merge by id + at+action key
    const seen = new Set(serverEvents.map((e) => e.id));
    const merged = [
      ...serverEvents,
      ...local.filter((e) => !seen.has(e.id) && !e.serverPersisted),
    ].slice(0, limit);
    return {
      events: merged,
      source: local.some((e) => !e.serverPersisted) ? 'merged' : 'server',
      stats: res.stats,
    };
  } catch {
    return { events: local, source: 'local' };
  }
}

export function clearAudit(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* */
  }
}

export function auditToCsv(events: AuditEvent[]): string {
  const header = 'at,actor,action,detail_en,detail_ar,server_persisted';
  const rows = events.map((e) =>
    [
      e.at,
      e.actor,
      e.action,
      csvEscape(e.detailEn),
      csvEscape(e.detailAr),
      e.serverPersisted ? 'yes' : 'no',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
