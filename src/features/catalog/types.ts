import { SUPPORTED_COUNTRIES, SUPPORTED_LOCALES } from '@/config/product';

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code'];
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface ActivePrice {
  priceVersionId: string;
  currencyCode: string;
  amountMinor: number;
  effectiveFrom: string;
}

export interface ServiceSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  country: CountryCode;
  activePrice: ActivePrice | null;
}

export interface CatalogQueryResult<Row> {
  rows: Row[];
}

export interface CatalogQueryClient {
  query<Row>(sql: string, parameters: readonly unknown[]): Promise<CatalogQueryResult<Row>>;
}
