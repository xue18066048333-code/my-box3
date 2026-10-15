import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationUrl = new URL('../../supabase/migrations/001_catalog.sql', import.meta.url);

export async function createCatalogDatabase() {
  const database = new PGlite({ extensions: { pgcrypto } });
  const migration = await readFile(fileURLToPath(migrationUrl), 'utf8');

  await database.exec(migration);
  await database.exec('GRANT anon TO CURRENT_USER');
  return database;
}
