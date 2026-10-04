import { expect, test } from '@playwright/test';

const chatSelector = 'chat-widget, [data-chat-widget], script[src="https://widgets.leadconnectorhq.com/loader.js"]';

test.skip(process.env.PRVN_CHAT_TEST_ENABLED === 'true', 'Disabled checks use the default build or LIVE_SITE_URL.');

test('disabled public pages make no provider requests and render no chat', async ({ page }) => {
  const errors: string[] = [];
  const providerRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/leadconnectorhq\.com|gohighlevel\.com/.test(request.url())) providerRequests.push(request.url());
  });
  for (const route of ['/', '/services', '/gallery', '/quote', '/contact']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator(chatSelector)).toHaveCount(0);
    await expect(page.locator('script[src*="leadconnectorhq.com"]')).toHaveCount(0);
  }
  expect(providerRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('unimplemented private paths return a widget-free 404, without claiming portal acceptance', async ({ page }) => {
  const providerRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('leadconnectorhq.com')) providerRequests.push(request.url());
  });
  for (const route of [
    '/admin',
    '/admin/login',
    '/admin/estimates',
    '/admin/estimate-builder',
    '/admin/settings',
    '/estimate/share/test',
    '/print/test',
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This slab is not on the plan.' })).toBeVisible();
    await expect(page.locator(chatSelector)).toHaveCount(0);
    await expect(page.locator('script[src*="leadconnectorhq.com"]')).toHaveCount(0);
  }
  expect(providerRequests).toEqual([]);
});

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`disabled site controls remain reachable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(chatSelector)).toHaveCount(0);
    const dock = page.locator('[data-conversion-dock]');
    if (await dock.isVisible()) {
      for (const label of ['Call PRVN', 'Text PRVN', 'Get a quote']) {
        const link = dock.getByRole('link', { name: label });
        await expect(link).toBeVisible();
        await link.click({ trial: true });
      }
    }
  });
}

test('public content and contact links remain useful without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
  await expect(page.locator('a[href^="tel:"]').first()).toBeAttached();
  await expect(page.locator('a[href^="sms:"]').first()).toBeAttached();
  await expect(page.locator(chatSelector)).toHaveCount(0);
  await context.close();
});
