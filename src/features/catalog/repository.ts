import type { CatalogQueryClient, CountryCode, Locale, ServiceSummary } from './types';

interface ServiceSummaryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  country: CountryCode;
  price_version_id: string | null;
  currency_code: string | null;
  amount_minor: number | null;
  effective_from: Date | string | null;
}

const publishedCatalogQuery = `
  SELECT DISTINCT ON (services.id)
    services.id,
    services.slug,
    service_translations.name,
    service_translations.description,
    packages.country_code AS country,
    price_versions.id AS price_version_id,
    price_versions.currency_code,
    price_versions.amount_minor,
    price_versions.effective_from
  FROM services
  INNER JOIN service_translations
    ON service_translations.service_id = services.id
  INNER JOIN packages
    ON packages.service_id = services.id
  LEFT JOIN package_options
    ON package_options.package_id = packages.id
    AND package_options.published_at IS NOT NULL
  LEFT JOIN price_versions
    ON price_versions.package_option_id = package_options.id
    AND price_versions.published_at IS NOT NULL
    AND price_versions.effective_from <= $3
    AND (price_versions.effective_to IS NULL OR price_versions.effective_to > $3)
  WHERE services.published_at IS NOT NULL
    AND service_translations.published_at IS NOT NULL
    AND packages.published_at IS NOT NULL
    AND packages.country_code = $1
    AND service_translations.locale = $2
  ORDER BY services.id, price_versions.effective_from DESC NULLS LAST;
`;

export class CatalogRepository {
  constructor(private readonly client: CatalogQueryClient) {}

  async listPublished(
    country: CountryCode,
    locale: Locale,
    now = new Date(),
  ): Promise<ServiceSummary[]> {
    const result = await this.client.query<ServiceSummaryRow>(publishedCatalogQuery, [
      country,
      locale,
      now.toISOString(),
    ]);

    return result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      country: row.country,
      activePrice:
        row.price_version_id === null ||
        row.currency_code === null ||
        row.amount_minor === null ||
        row.amount_minor <= 0 ||
        row.effective_from === null
          ? null
          : {
              priceVersionId: row.price_version_id,
              currencyCode: row.currency_code,
              amountMinor: row.amount_minor,
              effectiveFrom: new Date(row.effective_from).toISOString(),
            },
    }));
  }
}
