import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const database = new PGlite({ extensions: { pgcrypto } });
const catalogMigration = await readFile(resolve('supabase/migrations/001_catalog.sql'), 'utf8');
const bookingMigration = await readFile(resolve('supabase/migrations/002_bookings.sql'), 'utf8');
const seed = await readFile(resolve('supabase/seed.sql'), 'utf8');

await database.exec(catalogMigration);
await database.exec(bookingMigration);
await database.exec(seed);
await database.close();
console.log('Catalog and booking migrations plus seed executed successfully in PGlite.');
