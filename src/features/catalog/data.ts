import type { CatalogRepository } from './repository';
import type { CountryCode, Locale, ServiceSummary } from './types';
import type { StandardRates } from '@/features/pricing/types';

export function isDemoMode() {
  return process.env.NODE_ENV !== 'production' && process.env.CATALOG_DATA_MODE === 'demo';
}

export async function loadCatalog(country: CountryCode, locale: Locale, repository?: Pick<CatalogRepository, 'listPublished'>): Promise<{demo: boolean; services: ServiceSummary[]}> {
  if (repository) return {demo: false, services: await repository.listPublished(country, locale)};
  if (!isDemoMode()) return {demo: false, services: []};
  const { demoCatalogRepository } = await import('./fixtures/demo-catalog');
  return {demo: true, services: await demoCatalogRepository.listPublished(country, locale)};
}

export async function loadQuoteRates(): Promise<StandardRates> {
  if (!isDemoMode()) return {};
  return (await import('./fixtures/demo-catalog')).demoRates;
}
