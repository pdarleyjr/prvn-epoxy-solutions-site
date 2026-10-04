import { expect, test, type Page } from '@playwright/test';

const loaderUrl = 'https://widgets.leadconnectorhq.com/loader.js';
const loaderSelector = `script[src="${loaderUrl}"]`;
const embed = process.env.PRVN_CHAT_TEST_EMBED === 'legacy' ? 'legacy' : 'gtm';

declare global {
  interface Window {
    __prvnChatMockCalls?: number;
    __prvnChatMockDocument?: Document;
  }
}

const stubLoader = (page: Page) =>
  page.route(loaderUrl, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: '/* Local architecture stub; no provider behavior. */',
    })
  );

const addTrigger = (page: Page) =>
  page.evaluate(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.openPrvnChat = '';
    button.textContent = 'Local mock chat trigger';
    button.style.cssText = 'position:fixed;top:120px;left:8px;z-index:1000';
    document.body.append(button);
  });

test.describe('local mocked LeadConnector architecture only', () => {
  test.skip(
    process.env.PRVN_CHAT_TEST_ENABLED !== 'true',
    'Explicitly opt in with PRVN_CHAT_ARCHITECTURE=true; these mocks do not establish HighLevel acceptance.'
  );

  test('sample embed and one vendor loader are direct body children without a positioning wrapper', async ({
    page,
  }) => {
    await stubLoader(page);
    await page.goto('/');
    const loader = page.locator(loaderSelector);
    const host = page.locator(embed === 'legacy' ? 'chat-widget' : '[data-chat-widget]');
    await expect(loader).toHaveCount(1);
    await expect(loader).toHaveAttribute('src', loaderUrl);
    await expect(loader).toHaveAttribute(
      'data-resources-url',
      'https://widgets.leadconnectorhq.com/chat-widget/loader.js'
    );
    await expect(host).toHaveCount(1);
    if (embed === 'legacy') {
      await expect(host).toHaveAttribute('location-id', 'local-test-location-id');
      await expect(loader).not.toHaveAttribute('data-widget-id');
      await expect(page.locator('[data-chat-widget]')).toHaveCount(0);
    } else {
      await expect(host).toHaveAttribute('data-location-id', 'local-test-location-id');
      await expect(host).toHaveAttribute('data-widget-id', 'local-test-widget-id');
      await expect(loader).toHaveAttribute('data-widget-id', 'local-test-widget-id');
    }
    for (const element of [loader, host]) {
      expect(await element.evaluate((node) => node.parentElement === document.body)).toBe(true);
      await expect(element).not.toHaveAttribute('data-astro-transition-persist');
      await expect(element).not.toHaveAttribute('style');
    }
    await expect(page.locator('#prvn-leadconnector-chat, [data-leadconnector-root]')).toHaveCount(0);
  });

  test('delegated trigger calls a mocked API once and safely handles absent or throwing APIs', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await stubLoader(page);
    await page.goto('/');
    await addTrigger(page);
    await page.evaluate(() => {
      window.__prvnChatMockCalls = 0;
      window.leadConnector = {
        chatWidget: {
          openWidget: () => {
            window.__prvnChatMockCalls = (window.__prvnChatMockCalls ?? 0) + 1;
          },
        },
      };
    });
    const trigger = page.getByRole('button', { name: 'Local mock chat trigger' });
    await trigger.click();
    expect(await page.evaluate(() => window.__prvnChatMockCalls)).toBe(1);
    await page.evaluate(() => {
      window.leadConnector = undefined;
    });
    await trigger.click();
    await page.evaluate(() => {
      window.leadConnector = {
        chatWidget: {
          openWidget: () => {
            throw new Error('Deliberate local API stub failure');
          },
        },
      };
    });
    await trigger.click();
    expect(await page.evaluate(() => window.__prvnChatMockCalls)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('mocked loader failure leaves the quote link and wizard usable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(loaderUrl, (route) => route.abort('blockedbyclient'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
    await addTrigger(page);
    await page.getByRole('button', { name: 'Local mock chat trigger' }).click();
    const dockQuote = page.locator('[data-conversion-dock] a[href="/quote"]');
    const headerQuote = page.locator('[data-site-header] .nav-actions a[href="/quote"]').first();
    await ((await dockQuote.isVisible()) ? dockQuote : headerQuote).click();
    await expect(page).toHaveURL(/\/quote\/?$/);
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[data-step="1"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('private-route guard loads a new document and removes mocked provider globals', async ({ page }) => {
    await stubLoader(page);
    await page.goto('/');
    await expect(page.locator(loaderSelector)).toHaveCount(1);
    await page.evaluate(() => {
      window.__prvnChatMockDocument = document;
      window.leadConnector = { chatWidget: { openWidget: () => undefined } };
      const link = document.createElement('a');
      link.href = '/admin/login';
      link.textContent = 'Local private boundary check';
      link.style.cssText = 'position:fixed;top:120px;left:8px;z-index:1000';
      document.body.append(link);
    });
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().endsWith('/admin/login') && response.request().isNavigationRequest()
      ),
      page.getByRole('link', { name: 'Local private boundary check' }).click(),
    ]);
    expect(response.status()).toBe(404);
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await expect(page.getByRole('heading', { name: 'This slab is not on the plan.' })).toBeVisible();
    await expect(page.locator(`chat-widget, [data-chat-widget], ${loaderSelector}`)).toHaveCount(0);
    expect(await page.evaluate(() => window.leadConnector)).toBeUndefined();
    expect(await page.evaluate(() => window.__prvnChatMockDocument)).toBeUndefined();
  });
});
