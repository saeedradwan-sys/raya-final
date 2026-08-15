import { randomBytes, scryptSync } from 'node:crypto';
import { closeDatabase, databaseEnabled, getDatabase } from './database.mjs';

const organizationCode = String(process.env.RAYA_ORGANIZATION_CODE || 'raya').trim().toLowerCase();
const taxNumber = String(process.env.RAYA_CLIENT_TAX_NUMBER || '').replace(/\s/g, '');
const legalNameEn = String(process.env.RAYA_CLIENT_NAME_EN || '').trim();
const legalNameAr = String(process.env.RAYA_CLIENT_NAME_AR || '').trim() || null;
const accessCode = String(process.env.RAYA_CLIENT_ACCESS_CODE || '').trim();

if (!databaseEnabled()) throw new Error('RAYA_DATABASE_URL is required');
if (!taxNumber) throw new Error('RAYA_CLIENT_TAX_NUMBER is required');
if (!legalNameEn) throw new Error('RAYA_CLIENT_NAME_EN is required');
if (accessCode.length < 16) throw new Error('RAYA_CLIENT_ACCESS_CODE must be at least 16 characters');

const salt = randomBytes(16).toString('hex');
const accessCodeHash = `scrypt$${salt}$${scryptSync(accessCode, salt, 64).toString('hex')}`;
const db = getDatabase();

try {
  const organization = await db.query('SELECT id FROM organizations WHERE code = $1 LIMIT 1', [organizationCode]);
  if (!organization.rowCount) throw new Error(`Organization not found: ${organizationCode}`);
  await db.query(
    `INSERT INTO clients (
       organization_id, tax_number, legal_name_en, legal_name_ar, access_code_hash, status
     ) VALUES ($1,$2,$3,$4,$5,'active')
     ON CONFLICT (organization_id, tax_number) DO UPDATE SET
       legal_name_en = EXCLUDED.legal_name_en,
       legal_name_ar = EXCLUDED.legal_name_ar,
       access_code_hash = EXCLUDED.access_code_hash,
       status = 'active',
       updated_at = now()`,
    [organization.rows[0].id, taxNumber, legalNameEn, legalNameAr, accessCodeHash],
  );
  console.log(`Client provisioned: ${taxNumber}`);
} finally {
  await closeDatabase();
}
