import { afterEach, expect, it, vi } from 'vitest';
import { loadCatalog, loadQuoteRates } from '@/features/catalog/data';
import { previewQuote } from '@/features/quote/actions/preview-quote';
afterEach(() => vi.unstubAllEnvs());
it('fails closed in production even if demo mode is configured', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('CATALOG_DATA_MODE', 'demo');
  expect((await loadCatalog('TZ', 'en')).services).toEqual([]);
  expect(await loadQuoteRates()).toEqual({});
});
it('does not opt into demo data by default', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('CATALOG_DATA_MODE', '');
  expect((await loadCatalog('TH', 'en')).services).toEqual([]);
});
it('lists fixed site guarding as assessment-only instead of assigning a short-service demo price', async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('CATALOG_DATA_MODE', 'demo');
  const service = (await loadCatalog('TH', 'en')).services.find(({slug}) => slug === 'site-guarding');
  expect(service?.activePrice).toBeNull();
});
it('previews with versioned demo prices and cannot return an armed deposit', async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('CATALOG_DATA_MODE', 'demo');
  const result = await previewQuote({country:'TH', people:1, days:1, hoursPerDay:8, vehicles:0, armed:true});
  expect(result.lines[0].activePrice).toMatchObject({currencyCode:'THB',priceVersionId: expect.any(String), effectiveFrom: expect.any(String)});
  expect(result.depositMinor).toBe(0);
  expect(result.requiresAssessment).toBe(true);
});
