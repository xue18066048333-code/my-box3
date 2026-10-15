import { afterEach, describe, expect, it } from 'vitest';

import { CatalogRepository } from '@/features/catalog/repository';
import { createCatalogDatabase } from '../helpers/catalog-db';

const databases: Array<Awaited<ReturnType<typeof createCatalogDatabase>>> = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

async function createRepositoryFixture() {
  const database = await createCatalogDatabase();
  databases.push(database);

  await database.exec(`
    INSERT INTO services (id, slug, published_at) VALUES
      ('10000000-0000-0000-0000-000000000001', 'airport-transfer', '2026-01-01T00:00:00Z'),
      ('10000000-0000-0000-0000-000000000002', 'business-escort', NULL);
    INSERT INTO service_translations (service_id, locale, name, description, published_at) VALUES
      ('10000000-0000-0000-0000-000000000001', 'en', 'Airport transfer', 'Secure airport travel', '2026-01-01T00:00:00Z'),
      ('10000000-0000-0000-0000-000000000002', 'en', 'Business escort', 'Executive protection', '2026-01-01T00:00:00Z');
    INSERT INTO packages (id, service_id, country_code, slug, published_at) VALUES
      ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TZ', 'airport-standard', '2026-01-01T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'TH', 'airport-standard-th', '2026-01-01T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'TZ', 'business-standard', '2026-01-01T00:00:00Z');
    INSERT INTO package_options (id, package_id, code, requires_review, published_at) VALUES
      ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'standard', false, '2026-01-01T00:00:00Z');
  `);

  return {
    database,
    repository: new CatalogRepository({
      query: (sql, parameters) => database.query(sql, [...parameters]),
    }),
  };
}

describe('CatalogRepository', () => {
  it('returns only published services for the requested country and locale', async () => {
    const { repository } = await createRepositoryFixture();

    await expect(repository.listPublished('TZ', 'en')).resolves.toEqual([
      {
        id: '10000000-0000-0000-0000-000000000001',
        slug: 'airport-transfer',
        name: 'Airport transfer',
        description: 'Secure airport travel',
        country: 'TZ',
        activePrice: null,
      },
    ]);
  });

  it('keeps an expired price version out of active results', async () => {
    const { database, repository } = await createRepositoryFixture();
    await database.exec(`
      INSERT INTO price_versions (id, package_option_id, currency_code, amount_minor, effective_from, effective_to, published_at) VALUES
        ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'USD', 19900, '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z', '2025-01-01T00:00:00Z');
    `);

    const services = await repository.listPublished('TZ', 'en', new Date('2026-02-01T00:00:00Z'));

    expect(services[0]?.activePrice).toBeNull();
  });

  it('preserves the active price version identifier for a later quote snapshot', async () => {
    const { database, repository } = await createRepositoryFixture();
    await database.exec(`
      INSERT INTO price_versions (id, package_option_id, currency_code, amount_minor, effective_from, published_at) VALUES
        ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', 'USD', 19900, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    `);

    const services = await repository.listPublished('TZ', 'en', new Date('2026-02-01T00:00:00Z'));

    expect(services[0]?.activePrice).toEqual({
      priceVersionId: '40000000-0000-0000-0000-000000000010',
      currencyCode: 'USD',
      amountMinor: 19900,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    });
  });

  it('treats non-positive query results as an incomplete price', async () => {
    const repository = new CatalogRepository({
      query: async <Row>() => ({
        rows: [
          {
            id: '70000000-0000-0000-0000-000000000001',
            slug: 'airport-transfer',
            name: 'Airport transfer',
            description: 'Secure airport travel',
            country: 'TZ' as const,
            currency_code: 'USD',
            amount_minor: 0,
            effective_from: '2026-01-01T00:00:00Z',
          },
        ] as Row[],
      }),
    });

    const services = await repository.listPublished('TZ', 'en');

    expect(services[0]?.activePrice).toBeNull();
  });
});
