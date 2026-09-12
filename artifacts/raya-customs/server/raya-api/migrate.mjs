import { closeDatabase, runMigrations } from './database.mjs';

try {
  const results = await runMigrations();
  for (const result of results) {
    console.log(result.applied ? `Applied ${result.name}` : `${result.name} already applied`);
  }
} finally {
  await closeDatabase();
}
