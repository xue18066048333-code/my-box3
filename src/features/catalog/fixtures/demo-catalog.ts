import type { ActivePrice, CountryCode, Locale, ServiceSummary } from '../types';
import { requiresAssessment, serviceContent, serviceSlugs } from '../content';
import type { StandardRates } from '@/features/pricing/types';

// Unverified local demonstration values. Never seed or publish these as real prices.
const price = (country: CountryCode, index: number, amountMinor: number): ActivePrice => ({
  priceVersionId: `00000000-0000-4000-8000-${String((country === 'TZ' ? 100 : 200) + index).padStart(12, '0')}`,
  currencyCode: country === 'TZ' ? 'TZS' : 'THB', amountMinor,
  effectiveFrom: '2026-01-01T00:00:00.000Z',
});

export const demoRates: StandardRates = {
  TZ: {personnelHourlyPrice: price('TZ', 1, 1500000), overtimeHourlyPrice: price('TZ', 2, 2250000), vehicleDailyPrice: price('TZ', 3, 12000000), includedHoursPerDay: 8, taxBasisPoints: 1800, depositBasisPoints: 3000},
  TH: {personnelHourlyPrice: price('TH', 1, 30000), overtimeHourlyPrice: price('TH', 2, 45000), vehicleDailyPrice: price('TH', 3, 200000), includedHoursPerDay: 8, taxBasisPoints: 700, depositBasisPoints: 3000},
};

// Mirrors listPublished's country/locale result contract. This is not a backend publication source.
export const demoCatalogRepository = {
  async listPublished(country: CountryCode, locale: Locale): Promise<ServiceSummary[]> {
    return serviceSlugs.filter(slug => country === 'TZ' || slug !== 'armed-transport').map((slug, index) => {
      const content = serviceContent(slug, locale);
      return {
        id: `demo-${country}-${index}`, slug, name: content.name, description: content.scope, country,
        activePrice: requiresAssessment(slug) ? null : demoRates[country]!.personnelHourlyPrice,
      };
    });
  },
};
