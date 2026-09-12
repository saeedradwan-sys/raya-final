/** Persistent refresh-token rotation with an in-memory fallback for development. */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';

const store = new Map();

function tokenHash(jti) {
  return createHash('sha256').update(String(jti)).digest('hex');
}

export function newJti() {
  return randomBytes(16).toString('hex');
}

export function newFamilyId() {
  return randomUUID();
}

export async function saveRefresh(jti, meta) {
  if (!databaseEnabled()) {
    store.set(jti, {
      sub: meta.sub,
      realm: meta.realm,
      familyId: meta.familyId,
      expiresAt: meta.expiresAtSec,
      revoked: false,
    });
    return;
  }
  const userId = meta.realm === 'staff' ? meta.sub : null;
  const clientId = meta.realm === 'portal' ? meta.sub : null;
  await getDatabase().query(
    `INSERT INTO refresh_sessions (user_id, client_id, family_id, token_hash, expires_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, to_timestamp($5))`,
    [userId, clientId, meta.familyId, tokenHash(jti), meta.expiresAtSec],
  );
}

export async function consumeRefresh(jti) {
  if (!databaseEnabled()) {
    const record = store.get(jti);
    if (!record) return { ok: false, error: 'unknown_refresh' };
    if (record.revoked) return { ok: false, error: 'revoked_reuse' };
    if (record.expiresAt < Math.floor(Date.now() / 1000)) {
      store.delete(jti);
      return { ok: false, error: 'refresh_expired' };
    }
    record.revoked = true;
    store.set(jti, record);
    return { ok: true, record };
  }

  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, user_id, client_id, family_id, expires_at, revoked_at
       FROM refresh_sessions WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash(jti)],
    );
    const record = result.rows[0];
    if (!record) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'unknown_refresh' };
    }
    if (record.revoked_at) {
      await client.query('COMMIT');
      return { ok: false, error: 'revoked_reuse' };
    }
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await client.query('DELETE FROM refresh_sessions WHERE id = $1', [record.id]);
      await client.query('COMMIT');
      return { ok: false, error: 'refresh_expired' };
    }
    await client.query('UPDATE refresh_sessions SET revoked_at = now() WHERE id = $1', [record.id]);
    await client.query('COMMIT');
    return {
      ok: true,
      record: {
        sub: String(record.user_id || record.client_id),
        realm: record.user_id ? 'staff' : 'portal',
        familyId: String(record.family_id),
        expiresAt: Math.floor(new Date(record.expires_at).getTime() / 1000),
        revoked: true,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeFamily(familyId) {
  if (!databaseEnabled()) {
    for (const [jti, record] of store.entries()) {
      if (record.familyId === familyId) {
        record.revoked = true;
        store.set(jti, record);
      }
    }
    return;
  }
  await getDatabase().query(
    'UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE family_id = $1::uuid',
    [familyId],
  );
}

export async function revokeBySub(sub, realm) {
  if (!databaseEnabled()) {
    for (const [jti, record] of store.entries()) {
      if (record.sub === sub && record.realm === realm) {
        record.revoked = true;
        store.set(jti, record);
      }
    }
    return;
  }
  const column = realm === 'portal' ? 'client_id' : 'user_id';
  await getDatabase().query(
    `UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE ${column} = $1::uuid`,
    [sub],
  );
}

export async function stats() {
  if (!databaseEnabled()) {
    let active = 0;
    let revoked = 0;
    const now = Math.floor(Date.now() / 1000);
    for (const record of store.values()) {
      if (record.revoked || record.expiresAt < now) revoked += 1;
      else active += 1;
    }
    return { active, revoked, total: store.size, backend: 'memory' };
  }
  const result = await getDatabase().query(
    `SELECT
       count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now())::int AS active,
       count(*) FILTER (WHERE revoked_at IS NOT NULL OR expires_at <= now())::int AS revoked,
       count(*)::int AS total
     FROM refresh_sessions`,
  );
  return { ...result.rows[0], backend: 'postgresql' };
}
