/** Provision the first private-platform owner. Run once on the VPS with /etc/raya/raya.env loaded. */
import { randomBytes, scryptSync } from 'node:crypto';
import { closeDatabase, databaseEnabled, getDatabase } from './database.mjs';

const name = String(process.env.RAYA_OWNER_NAME || '').trim();
const email = String(process.env.RAYA_OWNER_EMAIL || '').trim().toLowerCase();
const activationCode = String(process.env.RAYA_OWNER_ACTIVATION_CODE || '').trim();
const organizationCode = String(process.env.RAYA_ORGANIZATION_CODE || 'raya').trim().toLowerCase();
const organizationName = String(process.env.RAYA_ORGANIZATION_NAME || 'Raya Jordan').trim();

if (!databaseEnabled()) throw new Error('RAYA_DATABASE_URL is required');
if (!name || !email || !activationCode) throw new Error('RAYA_OWNER_NAME, RAYA_OWNER_EMAIL and RAYA_OWNER_ACTIVATION_CODE are required');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('RAYA_OWNER_EMAIL is invalid');
if (activationCode.length < 16) throw new Error('RAYA_OWNER_ACTIVATION_CODE must be at least 16 characters');

function hashActivationCode(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

const db = getDatabase();
try {
  await db.query('BEGIN');
  const org = await db.query(
    `INSERT INTO organizations (code, legal_name) VALUES ($1, $2)
     ON CONFLICT (code) DO UPDATE SET legal_name = EXCLUDED.legal_name, updated_at = now()
     RETURNING id`,
    [organizationCode, organizationName],
  );
  const user = await db.query(
    `INSERT INTO users (email, display_name_en, password_hash, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email) DO UPDATE SET display_name_en = EXCLUDED.display_name_en, password_hash = EXCLUDED.password_hash, status = 'active', updated_at = now()
     RETURNING id`,
    [email, name, hashActivationCode(activationCode)],
  );
  await db.query(
    `INSERT INTO organization_memberships (organization_id, user_id, role, permissions, active)
     VALUES ($1, $2, 'owner', '["*"]'::jsonb, true)
     ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', permissions = '["*"]'::jsonb, active = true, updated_at = now()`,
    [org.rows[0].id, user.rows[0].id],
  );
  await db.query('COMMIT');
  console.log(`Owner provisioned: ${email}`);
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await closeDatabase();
}