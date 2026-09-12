import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

function clean(value) {
  return String(value || '').trim();
}

function hashAccessSecret(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyAccessSecret(stored, candidate) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const actual = Buffer.from(parts[2], 'hex');
  const derived = scryptSync(String(candidate || ''), parts[1], actual.length);
  return actual.length === derived.length && timingSafeEqual(actual, derived);
}

function ownerConfig(env, optional) {
  const name = clean(env.RAYA_OWNER_NAME);
  const email = clean(env.RAYA_OWNER_EMAIL).toLowerCase();
  const activationCode = clean(env.RAYA_OWNER_ACTIVATION_CODE);
  const configured = Boolean(name || email || activationCode);

  if (!configured && optional) return null;
  if (!name || !email || !activationCode) {
    throw new Error(
      'RAYA_OWNER_NAME, RAYA_OWNER_EMAIL and RAYA_OWNER_ACTIVATION_CODE must be configured together',
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('RAYA_OWNER_EMAIL is invalid');
  }
  if (activationCode.length < 16) {
    throw new Error('RAYA_OWNER_ACTIVATION_CODE must be at least 16 characters');
  }

  return {
    name,
    email,
    activationCode,
    organizationCode: clean(env.RAYA_ORGANIZATION_CODE || 'raya').toLowerCase(),
    organizationName: clean(env.RAYA_ORGANIZATION_NAME || 'Raya Jordan'),
  };
}

function clientConfig(env, optional) {
  const taxNumber = clean(env.RAYA_CLIENT_TAX_NUMBER).replace(/\s/g, '');
  const legalNameEn = clean(env.RAYA_CLIENT_NAME_EN);
  const accessCode = clean(env.RAYA_CLIENT_ACCESS_CODE);
  const configured = Boolean(taxNumber || legalNameEn || accessCode);

  if (!configured && optional) return null;
  if (!taxNumber || !legalNameEn || !accessCode) {
    throw new Error(
      'RAYA_CLIENT_TAX_NUMBER, RAYA_CLIENT_NAME_EN and RAYA_CLIENT_ACCESS_CODE must be configured together',
    );
  }
  if (accessCode.length < 16) {
    throw new Error('RAYA_CLIENT_ACCESS_CODE must be at least 16 characters');
  }

  return {
    taxNumber,
    legalNameEn,
    legalNameAr: clean(env.RAYA_CLIENT_NAME_AR) || null,
    accessCode,
    organizationCode: clean(env.RAYA_ORGANIZATION_CODE || 'raya').toLowerCase(),
  };
}

async function withTransaction(db, callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureOwnerAccount(db, env = process.env) {
  const config = ownerConfig(env, false);

  return withTransaction(db, async (client) => {
    const organization = await client.query(
      `INSERT INTO organizations (code, legal_name)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET
         legal_name = EXCLUDED.legal_name,
         updated_at = now()
       RETURNING id`,
      [config.organizationCode, config.organizationName],
    );

    const existing = await client.query(
      'SELECT password_hash FROM users WHERE email = $1 LIMIT 1',
      [config.email],
    );
    const currentHash = existing.rows[0]?.password_hash;
    const passwordHash = verifyAccessSecret(
      currentHash,
      config.activationCode,
    )
      ? currentHash
      : hashAccessSecret(config.activationCode);

    const user = await client.query(
      `INSERT INTO users (email, display_name_en, password_hash, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (email) DO UPDATE SET
         display_name_en = EXCLUDED.display_name_en,
         password_hash = EXCLUDED.password_hash,
         status = 'active',
         updated_at = now()
       RETURNING id`,
      [config.email, config.name, passwordHash],
    );

    await client.query(
      `INSERT INTO organization_memberships (
         organization_id, user_id, role, permissions, active
       ) VALUES ($1, $2, 'owner', '["*"]'::jsonb, true)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET
         role = 'owner',
         permissions = '["*"]'::jsonb,
         active = true,
         updated_at = now()`,
      [organization.rows[0].id, user.rows[0].id],
    );

    return { created: !currentHash, credentialChanged: Boolean(currentHash && passwordHash !== currentHash) };
  });
}

export async function ensureClientAccount(db, env = process.env) {
  const config = clientConfig(env, false);

  return withTransaction(db, async (client) => {
    const organization = await client.query(
      'SELECT id FROM organizations WHERE code = $1 LIMIT 1',
      [config.organizationCode],
    );
    if (!organization.rowCount) {
      throw new Error(`Organization not found: ${config.organizationCode}`);
    }

    const organizationId = organization.rows[0].id;
    const existing = await client.query(
      `SELECT access_code_hash
       FROM clients
       WHERE organization_id = $1 AND tax_number = $2
       LIMIT 1`,
      [organizationId, config.taxNumber],
    );
    const currentHash = existing.rows[0]?.access_code_hash;
    const accessCodeHash = verifyAccessSecret(currentHash, config.accessCode)
      ? currentHash
      : hashAccessSecret(config.accessCode);

    await client.query(
      `INSERT INTO clients (
         organization_id, tax_number, legal_name_en, legal_name_ar,
         access_code_hash, status
       ) VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (organization_id, tax_number) DO UPDATE SET
         legal_name_en = EXCLUDED.legal_name_en,
         legal_name_ar = EXCLUDED.legal_name_ar,
         access_code_hash = EXCLUDED.access_code_hash,
         status = 'active',
         updated_at = now()`,
      [
        organizationId,
        config.taxNumber,
        config.legalNameEn,
        config.legalNameAr,
        accessCodeHash,
      ],
    );

    return { created: !currentHash, credentialChanged: Boolean(currentHash && accessCodeHash !== currentHash) };
  });
}

export async function ensureConfiguredAccounts(db, env = process.env) {
  const owner = ownerConfig(env, true);
  const client = clientConfig(env, true);
  if (!owner && !client) return { configured: false };

  const result = { configured: true, owner: null, client: null };
  if (owner) result.owner = await ensureOwnerAccount(db, env);
  if (client) result.client = await ensureClientAccount(db, env);
  return result;
}