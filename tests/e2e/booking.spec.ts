import {expect, test} from '@playwright/test';

test('submits a priced demo booking without registration', async ({page}) => {
  await page.goto('/en/services/airport-transfer?country=TH');
  await page.getByLabel('Full name', {exact:true}).fill('Jane Example');
  await page.getByLabel('Email', {exact:true}).fill('jane@example.com');
  await page.getByRole('button', {name:'Submit booking', exact:true}).click();
  await expect(page.getByTestId('booking-confirmation')).toContainText('Demo confirmation');
  await expect(page.getByTestId('booking-confirmation')).toContainText('Awaiting deposit');
  await expect(page.getByTestId('booking-confirmation')).toContainText('770.40');
  await expect(page.getByTestId('booking-confirmation')).toContainText(/BK-[A-F0-9]{32}/);
});

test('validates contact and submits an assessment without a payable deposit', async ({page}) => {
  await page.goto('/en/services/risk-assessment?country=TH');
  await page.getByRole('button', {name:'Submit booking', exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'name'})).toContainText('name');
  await page.getByLabel('Full name', {exact:true}).fill('Jane');
  await page.getByRole('button', {name:'Submit booking', exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'phone or email'})).toContainText('phone or email');
  await page.getByLabel('Phone', {exact:true}).fill('+66 12345678');
  await page.getByRole('button', {name:'Submit booking', exact:true}).click();
  await expect(page.getByTestId('booking-confirmation')).toContainText('Assessment requested');
  await expect(page.getByTestId('booking-confirmation')).not.toContainText('THB');
});

test('freezes the submitted configuration until a new booking is started', async ({page}) => {
  let release!: () => void;
  let markSeen!: () => void;
  const requestSeen = new Promise<void>(resolve => {markSeen = resolve;});
  const releaseRequest = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/en/services/airport-transfer**', async route => {
    const request = route.request();
    if (request.method() === 'POST' && request.headers()['next-action']) {
      markSeen();
      await releaseRequest;
    }
    await route.continue();
  });
  await page.goto('/en/services/airport-transfer?country=TH');
  await page.getByLabel('Full name', {exact:true}).fill('Jane Example');
  await page.getByLabel('Email', {exact:true}).fill('jane@example.com');
  const submit = page.getByRole('button', {name:'Submit booking', exact:true}).click();
  await requestSeen;
  await expect(page.getByLabel('People')).toBeDisabled();
  await expect(page.getByLabel('Armed protection')).toBeDisabled();
  await page.locator('#quote-people').evaluate(element => {
    (element as HTMLInputElement).value = '2';
    element.dispatchEvent(new Event('input', {bubbles:true}));
    element.dispatchEvent(new Event('change', {bubbles:true}));
  });
  await page.getByLabel('Armed protection').evaluate(element => {
    (element as HTMLInputElement).checked = true;
    element.dispatchEvent(new Event('change', {bubbles:true}));
  });
  release();
  await submit;
  await expect(page.getByTestId('booking-confirmation')).toContainText('Awaiting deposit');
  await expect(page.getByTestId('booking-confirmation-configuration')).toContainText('1 people');
  await expect(page.getByTestId('booking-confirmation-configuration')).toContainText('unarmed');
  await expect(page.getByLabel('People')).toBeDisabled();
  await page.getByRole('button', {name:'Start a new booking'}).click();
  await expect(page.getByRole('button', {name:'Submit booking', exact:true})).toBeVisible();
  await expect(page.getByLabel('People')).toBeEnabled();
  await expect(page.getByLabel('People')).toHaveValue('1');
  await expect(page.getByLabel('Armed protection')).not.toBeChecked();
});
