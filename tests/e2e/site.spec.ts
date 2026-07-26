import { expect, test } from '@playwright/test';

const requiredWidths = [320, 390, 768, 1024, 1440];

test('homepage keeps the essential experience inside every viewport', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  for (const width of requiredWidths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-process-timeline] article')).toHaveCount(6);
  expect(
    await page.locator('[data-finish-scroll]').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  ).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('mobile drawer traps focus, closes with Escape, and survives client-side navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('[data-nav-toggle]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toHaveAttribute('aria-label', 'Close navigation');
  await expect(page.locator('[data-mobile-drawer]')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-mobile-drawer]')).toContainText('Start a Quote');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');

  await menu.click();
  await page.getByRole('link', { name: 'Gallery' }).last().click();
  await expect(page).toHaveURL(/\/gallery$/);
  await page.locator('[data-gallery-item]').first().click();
  await expect(page.getByRole('dialog', { name: 'Gallery image viewer' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Gallery image viewer' })).toBeHidden();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.locator('[data-nav-toggle]').click();
  await expect(page.locator('[data-mobile-drawer]')).toHaveAttribute('aria-hidden', 'false');
});

test('configurator fills all quote fields and the wizard preserves data on API failure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-selector="space"][data-value="commercial"]').click();
  await page.locator('[data-selector="finish"][data-value="quartz"]').click();
  await page.locator('[data-selector="style"][data-value="industrial"]').click();
  const quoteLink = page.locator('[data-result-quote]');
  await expect(quoteLink).toHaveAttribute('href', /space=commercial.*finish=quartz.*style=industrial/);
  await quoteLink.click();
  await expect(page).toHaveURL(/\/quote\?space=commercial&finish=quartz&style=industrial/);
  await expect(page.locator('input[name="projectType"][value="Commercial space"]')).toBeChecked();
  await expect(page.locator('input[name="finishPreference"][value="PRVN Quartz System"]')).toBeChecked();
  await expect(page.locator('[data-finish-style]')).toHaveValue('Industrial');

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Project location Required').fill('Miami, FL');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Name Required').fill('Avery Customer');
  await page.getByLabel('Phone Required').fill('954-555-0199');
  await page.getByLabel('Email Required').fill('avery@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('[data-review="finishStyle"]')).toHaveText('Industrial');

  await page.route('**/api/quote', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Online requests are unavailable.' }),
    });
  });
  await page.getByRole('button', { name: 'Send quote request' }).click();
  await expect(page.locator('[data-form-status]')).toContainText('Call 954-655-4199');
  await expect(page.locator('input[name="name"]')).toHaveValue('Avery Customer');
  await expect(page.locator('[data-step="7"]')).toBeVisible();
});

test('reduced motion still exposes the homepage controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Get a free quote' })).toBeVisible();
  await expect(page.locator('[data-before-after] input[type="range"]')).toBeEnabled();
});
