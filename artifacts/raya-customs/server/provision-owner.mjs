import { closeDatabase, databaseEnabled, getDatabase } from './database.mjs';
import { ensureOwnerAccount } from './accountProvisioning.mjs';

if (!databaseEnabled()) throw new Error('RAYA_DATABASE_URL is required');
try {
  await ensureOwnerAccount(getDatabase());
  console.log('Owner account provisioned.');
} finally {
  await closeDatabase();
}