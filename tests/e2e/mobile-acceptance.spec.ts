import {expect, test, type Page, type TestInfo} from '@playwright/test';
import {requiresAssessment, serviceSlugs} from '../../src/features/catalog/content';

type Contact = {name: string; phone?: string; email?: string};
type StandardService = {slug: string; country: 'TZ' | 'TH'; currency: 'TZS' | 'THB'; contact: Contact};

const standardServices: readonly StandardService[] = [
  {slug: 'airport-transfer', country: 'TZ', currency: 'TZS', contact: {name: 'Synthetic Airport Tanzania', phone: '+255700000001'}},
  {slug: 'business-escort', country: 'TH', currency: 'THB', contact: {name: 'Synthetic Business Thailand', email: 'business.th@example.test'}},
  {slug: 'travel-escort', country: 'TZ', currency: 'TZS', contact: {name: 'Synthetic Travel Tanzania', phone: '+255700000002'}},
];

const assessmentServices = [
  {slug: 'risk-assessment', country: 'TH', contact: {name: 'Synthetic Custom Contact', email: 'custom.th@example.test'}},
  {slug: 'site-guarding', country: 'TH', contact: {name: 'Synthetic Site Thailand', email: 'site.th@example.test'}},
] as const;

const canonicalStandardSlugs = serviceSlugs.filter(slug => !requiresAssessment(slug));
test('standard acceptance table covers every canonical standard service', () => {
  expect([...standardServices].map(service => service.slug).sort()).toEqual([...canonicalStandardSlugs].sort());
});

async function fillSyntheticContact(page: Page, contact: Contact) {
  await page.getByLabel('Full name', {exact: true}).fill(contact.name);
  if (contact.phone) await page.getByLabel('Phone', {exact: true}).fill(contact.phone);
  if (contact.email) await page.getByLabel('Email', {exact: true}).fill(contact.email);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({path: `test-results/stage-1-${name}-${testInfo.project.name}.png`, fullPage: true});
}

test('320px viewport has no horizontal overflow and the submit action remains reachable', async ({page}, testInfo) => {
  await page.setViewportSize({width: 320, height: 800});
  await page.goto('/en/services/airport-transfer?country=TZ');
  await expect(page.getByTestId('quote-total')).toContainText('TZS');
  await fillSyntheticContact(page, {name: 'Synthetic Mobile Contact', phone: '+255700000003'});

  const submit = page.getByRole('button', {name: 'Submit booking', exact: true});
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  await submit.click();
  await expect(page.getByTestId('booking-confirmation')).toContainText('Awaiting deposit');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, testInfo, 'mobile-320-confirmation');
});

test('a user can quote and submit each standard service', async ({page}, testInfo) => {
  for (const service of standardServices) {
    await page.goto(`/en/services/${service.slug}?country=${service.country}`);
    await expect(page.getByTestId('quote-total')).toContainText(service.currency);
    await expect(page.getByTestId('quote-deposit')).toContainText(service.currency);
    await fillSyntheticContact(page, service.contact);
    await page.getByRole('button', {name: 'Submit booking', exact: true}).click();
    const confirmation = page.getByTestId('booking-confirmation');
    await expect(confirmation).toContainText('Awaiting deposit');
    await expect(confirmation).toContainText(service.currency);
    await capture(page, testInfo, `standard-${service.slug}-${service.country}`);
  }
});

test('assessment services submit without a fabricated total', async ({page}, testInfo) => {
  for (const service of assessmentServices) {
    await page.goto(`/en/services/${service.slug}?country=${service.country}`);
    await expect(page.getByRole('status')).toContainText('Quote after assessment');
    await expect(page.getByTestId('quote-total')).toHaveCount(0);
    if (service.slug === 'risk-assessment') {
      await page.getByRole('link', {name: '中文', exact: true}).click();
      await expect(page).toHaveURL('/zh/services/risk-assessment?country=TH');
      await page.goto(`/en/services/${service.slug}?country=${service.country}`);
    }
    await fillSyntheticContact(page, service.contact);
    await page.getByRole('button', {name: 'Submit booking', exact: true}).click();
    const confirmation = page.getByTestId('booking-confirmation');
    await expect(confirmation).toContainText('Assessment requested');
    await expect(confirmation).not.toContainText('THB');
    await expect(confirmation).not.toContainText('0.00');
    await capture(page, testInfo, `${service.slug}-assessment-${service.country.toLowerCase()}`);
  }
});

test('armed transport submits as an assessment with no payable deposit', async ({page}, testInfo) => {
  await page.goto('/en/services/armed-transport?country=TZ');
  await expect(page.getByRole('status')).toContainText('Review required');
  await expect(page.getByTestId('quote-deposit')).toHaveCount(0);
  await fillSyntheticContact(page, {name: 'Synthetic Armed Contact', phone: '+255700000004'});
  await page.getByRole('button', {name: 'Submit booking', exact: true}).click();
  const confirmation = page.getByTestId('booking-confirmation');
  await expect(confirmation).toContainText('Assessment requested');
  await expect(confirmation).not.toContainText('TZS');
  await capture(page, testInfo, 'armed-assessment-tz');
});
