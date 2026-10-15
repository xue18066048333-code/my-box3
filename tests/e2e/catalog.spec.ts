import { expect, test } from '@playwright/test';

test('country selection filters published services', async ({ page }) => {
  await page.goto('/en?country=TZ');
  await expect(page.getByRole('heading', { name: 'Armed transport', exact: true })).toBeVisible();
  await page.getByLabel('Service country').selectOption('TH');
  await page.getByRole('button', { name: 'Apply country' }).click();
  await expect(page).toHaveURL(/country=TH/);
  await expect(page.getByRole('heading', { name: 'Armed transport', exact: true })).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(8);
});

for (const width of [320, 1280]) {
  test(`detail configuration and currency at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/en/services/airport-transfer?country=TZ');
    await expect(page.getByText('Demo estimate', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('quote-total')).toContainText('TZS');
    await page.getByLabel('People', {exact: true}).fill('3');
    await expect(page.getByTestId('quote-total')).toContainText('424,800.00');
    if (width === 320) await expect(page.getByRole('button', {name: 'Review estimate', exact:true})).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `test-results/catalog-detail-${testInfo.project.name}-${width}.png`, fullPage: true});
    await page.getByLabel('Service country').selectOption('TH');
    await page.getByRole('button', { name: 'Apply country' }).click();
    await expect(page.getByTestId('quote-total')).toContainText('THB');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Armed protection').check();
    await expect(page.getByRole('status')).toContainText('Review required');
    await expect(page.getByTestId('quote-deposit')).toHaveCount(0);
  });
}

test('locale links preserve country and service and custom quotes have no numeric total', async ({ page }) => {
  await page.goto('/en/services/risk-assessment?country=TH');
  await expect(page.getByRole('status')).toContainText('Quote after assessment');
  await expect(page.getByTestId('quote-total')).toHaveCount(0);
  await page.getByRole('link', {name: '中文', exact: true}).click();
  await expect(page).toHaveURL('/zh/services/risk-assessment?country=TH');
  await expect(page.getByRole('status')).toContainText('评估后报价');
});

test('keeps quote controls unavailable until hydration', async ({ page }) => {
  await page.route('**/_next/static/**/*.js*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/en/services/airport-transfer?country=TH', {waitUntil: 'commit'});
  const people = page.getByLabel('People', {exact: true});
  await expect(people).toBeVisible();
  await expect(people).toBeDisabled();
  await expect(people).toHaveValue('1');
  await expect(page.getByTestId('quote-total')).toContainText('2,568.00');
  await expect(people).toBeEnabled({timeout: 10000});
  await people.fill('3');
  await expect(page.getByTestId('quote-total')).toContainText('7,704.00');
  await page.getByLabel('Days', {exact: true}).fill('2');
  await expect(people).toHaveValue('3');
  await expect(page.getByTestId('quote-total')).toContainText('15,408.00');
});

test('preserves the detail route across unavailable country and locale switches', async ({ page }) => {
  await page.goto('/en/services/armed-transport?country=TZ');
  await page.getByLabel('Service country').selectOption('TH');
  await page.locator('.country-form button').click();
  await expect(page).toHaveURL('/en/services/armed-transport?country=TH');
  await expect(page.getByRole('status')).toContainText('Published services are currently unavailable');
  await page.locator('a[href="/zh/services/armed-transport?country=TH"]').click();
  await expect(page).toHaveURL('/zh/services/armed-transport?country=TH');
  await page.locator('#service-country').selectOption('TZ');
  await page.locator('.country-form button').click();
  await expect(page).toHaveURL('/zh/services/armed-transport?country=TZ');
  await expect(page.getByRole('heading', {level: 1})).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveCount(1);
});
