import { afterEach, describe, expect, it } from 'vitest';

import { createCatalogDatabase } from '../helpers/catalog-db';

const databases: Array<Awaited<ReturnType<typeof createCatalogDatabase>>> = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

async function createPublicationFixture() {
  const database = await createCatalogDatabase();
  databases.push(database);

  await database.exec(`
    INSERT INTO services (id, slug, published_at) VALUES
      ('50000000-0000-0000-0000-000000000001', 'airport-transfer', CURRENT_TIMESTAMP),
      ('50000000-0000-0000-0000-000000000002', 'business-escort', NULL);
    INSERT INTO service_translations (id, service_id, locale, name, description, published_at) VALUES
      ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'en', 'Published service', 'Published service description', CURRENT_TIMESTAMP),
      ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'en', 'Draft service', 'Draft service description', CURRENT_TIMESTAMP);
    INSERT INTO packages (id, service_id, country_code, slug, published_at) VALUES
      ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'TZ', 'published-package', CURRENT_TIMESTAMP),
      ('52000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'TZ', 'draft-package', CURRENT_TIMESTAMP);
    INSERT INTO package_options (id, package_id, code, published_at) VALUES
      ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'standard', CURRENT_TIMESTAMP),
      ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'standard', CURRENT_TIMESTAMP);
    INSERT INTO price_versions (id, package_option_id, currency_code, amount_minor, effective_from, effective_to, published_at) VALUES
      ('54000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'USD', 10000, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, CURRENT_TIMESTAMP),
      ('54000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000001', 'USD', 11000, CURRENT_TIMESTAMP + INTERVAL '1 day', NULL, CURRENT_TIMESTAMP),
      ('54000000-0000-0000-0000-000000000003', '53000000-0000-0000-0000-000000000001', 'USD', 12000, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP),
      ('54000000-0000-0000-0000-000000000004', '53000000-0000-0000-0000-000000000002', 'USD', 13000, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, CURRENT_TIMESTAMP);
    INSERT INTO regions (id, package_id, country_code, code, name, published_at) VALUES
      ('55000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'TZ', 'dar', 'Dar es Salaam', CURRENT_TIMESTAMP),
      ('55000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'TZ', 'arusha', 'Arusha', CURRENT_TIMESTAMP);
  `);

  return database;
}

const validWriteByTable = {
  services: "INSERT INTO services (id, slug) VALUES ('60000000-0000-0000-0000-000000000001', 'write-service')",
  service_translations:
    "INSERT INTO service_translations (id, service_id, locale, name, description) VALUES ('61000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'en', 'Write translation', 'Write description')",
  packages:
    "INSERT INTO packages (id, service_id, country_code, slug) VALUES ('62000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'TZ', 'write-package')",
  package_options:
    "INSERT INTO package_options (id, package_id, code) VALUES ('63000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'write-option')",
  price_versions:
    "INSERT INTO price_versions (id, package_option_id, currency_code, amount_minor, effective_from) VALUES ('64000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'USD', 10000, CURRENT_TIMESTAMP)",
  regions:
    "INSERT INTO regions (id, package_id, country_code, code, name) VALUES ('65000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'TZ', 'write-region', 'Write region')",
} as const;

describe('catalog RLS', () => {
  it('allows public child rows only through a published ancestor chain and active price window', async () => {
    const database = await createPublicationFixture();
    await database.exec('SET ROLE anon');

    const expectedByTable = {
      services: '50000000-0000-0000-0000-000000000001',
      service_translations: '51000000-0000-0000-0000-000000000001',
      packages: '52000000-0000-0000-0000-000000000001',
      package_options: '53000000-0000-0000-0000-000000000001',
      price_versions: '54000000-0000-0000-0000-000000000001',
      regions: '55000000-0000-0000-0000-000000000001',
    } as const;

    for (const [table, expectedId] of Object.entries(expectedByTable)) {
      const result = await database.query<{ id: string }>(`SELECT id FROM ${table} ORDER BY id`);
      expect(result.rows).toEqual([{ id: expectedId }]);
    }
  });

  it.each(['anon', 'authenticated'] as const)(
    'denies structurally valid catalog writes to %s',
    async (role) => {
      const database = await createPublicationFixture();
      await database.exec(`SET ROLE ${role}`);

      for (const statement of Object.values(validWriteByTable)) {
        await expect(database.exec(statement)).rejects.toMatchObject({ code: '42501' });
      }
    },
  );

  it('rejects zero-valued price versions', async () => {
    const database = await createPublicationFixture();

    await expect(
      database.exec(`
        INSERT INTO price_versions (id, package_option_id, currency_code, amount_minor, effective_from, published_at)
        VALUES ('66000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'USD', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
