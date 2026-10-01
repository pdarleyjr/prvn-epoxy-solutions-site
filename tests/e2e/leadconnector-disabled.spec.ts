import { expect, test } from './fixtures';

test.skip(process.env.PRVN_CHAT_TEST_ENABLED === 'true', 'Run with PLAYWRIGHT_CHAT_DISABLED=true or LIVE_SITE_URL.');

test('unconfigured chat makes no provider requests or visible placeholders on public pages', async ({ page }) => {
  const errors: string[] = [];
  const providerRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/leadconnectorhq\.com|gohighlevel\.com/.test(request.url())) providerRequests.push(request.url());
  });
  for (const route of ['/', '/services', '/gallery', '/quote', '/contact']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[data-leadconnector-root], chat-widget, [data-chat-widget]')).toHaveCount(0);
    await expect(page.locator('script[src="https://widgets.leadconnectorhq.com/loader.js"]')).toHaveCount(0);
  }
  expect(providerRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('all specified private routes stay free of provider code', async ({ page }) => {
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
    await page.goto(route);
    await expect(page.locator('[data-leadconnector-root], chat-widget, [data-chat-widget]')).toHaveCount(0);
    await expect(page.locator('script[src="https://widgets.leadconnectorhq.com/loader.js"]')).toHaveCount(0);
  }
  expect(providerRequests).toEqual([]);
});

test('disabled enhancement preserves mobile and desktop controls at all requested widths', async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const dock = page.locator('[data-conversion-dock]');
    if (await dock.isVisible()) {
      for (const label of ['Call PRVN', 'Text PRVN', 'Get a quote']) {
        await expect(dock.getByRole('link', { name: label })).toBeVisible();
        await dock.getByRole('link', { name: label }).click({ trial: true });
      }
    }
  }
});

test('public content and contact links remain useful without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
  await expect(page.locator('a[href^="tel:"]').first()).toBeAttached();
  await expect(page.locator('a[href^="sms:"]').first()).toBeAttached();
  await expect(page.locator('[data-leadconnector-root]')).toHaveCount(0);
  await context.close();
});
