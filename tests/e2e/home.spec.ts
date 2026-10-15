import { expect, test } from '@playwright/test';

test('home renders a country selector and nine service placeholders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('combobox', { name: /service country/i })).toBeVisible();
  await expect(page.locator('#country option[value="TZ"]')).toHaveText(/tanzania/i);
  await expect(page.locator('#country option[value="TH"]')).toHaveText(/thailand/i);
  await expect(page.locator('article')).toHaveCount(9);
});

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  test('renders the home shell without horizontal overflow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('combobox', { name: /service country/i })).toBeVisible();
    await expect(page.locator('#country option[value="TZ"]')).toHaveText(/tanzania/i);
    await expect(page.locator('#country option[value="TH"]')).toHaveText(/thailand/i);
    await expect(page.locator('article')).toHaveCount(9);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
});
