import { closeDatabase, databaseEnabled, getDatabase } from './database.mjs';
import { ensureClientAccount } from './accountProvisioning.mjs';

if (!databaseEnabled()) throw new Error('RAYA_DATABASE_URL is required');
try {
  await ensureClientAccount(getDatabase());
  console.log('Client account provisioned.');
} finally {
  await closeDatabase();
}
