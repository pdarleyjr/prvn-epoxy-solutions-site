import { expect, test, type Page, type Route } from '@playwright/test';

// These identifiers and the provider double are local test fixtures, never live widget configuration.
const localWidgetId = 'local-test-widget-id';
const localLocationId = 'local-test-location-id';
const loaderUrl = 'https://widgets.leadconnectorhq.com/loader.js';
const enabledFixture = !process.env.LIVE_SITE_URL && process.env.PLAYWRIGHT_CHAT_DISABLED !== 'true';
const embed = process.env.PRVN_CHAT_TEST_EMBED === 'legacy' ? 'legacy' : 'gtm';
const widths = [320, 375, 390, 430, 768, 1440];

type MockChatState = {
  loaderRuns: number;
  opens: number;
  closes: number;
  active: boolean;
};

declare global {
  interface Window {
    __prvnChatTest?: MockChatState;
    __prvnChatTestRoot?: Element;
    __prvnChatTestDocument?: Document;
    __prvnChatTestDockClicks?: string[];
  }
}

// Models the official loader's placement contract: GTM inserts its custom element in
// the loader's parent; legacy upgrades the existing element. Fixed descendants remain
// within PRVN's containing block. No network messaging or CRM writes occur.
const providerDouble = `(() => {
  const script = document.currentScript;
  const root = script?.parentElement;
  if (!root) throw new Error('Provider fixture requires its persistent parent');
  const state = window.__prvnChatTest ??= { loaderRuns: 0, opens: 0, closes: 0, active: false };
  state.loaderRuns += 1;
  let host = root.querySelector('chat-widget');
  if (!host) {
    host = document.createElement('chat-widget');
    host.setAttribute('location-id', root.querySelector('[data-chat-widget]')?.dataset.locationId ?? '');
    root.append(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<style>:host{display:block}button{font:14px sans-serif}#launcher{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border:0;border-radius:50%;background:#0b54ff;color:white;pointer-events:auto}#panel{position:fixed;right:20px;bottom:88px;width:min(320px,calc(100% - 40px));height:min(350px,calc(100% - 110px));background:#0c1118;color:#f5f7fb;pointer-events:auto}#panel[hidden]{display:none}</style><button id="launcher" aria-label="Open mock PRVN chat">Chat</button><div id="panel" role="dialog" aria-label="Mock PRVN chat" hidden><button id="close" aria-label="Close mock PRVN chat">Close</button><p>Local provider fixture</p></div>';
  const panel = shadow.getElementById('panel');
  const openWidget = () => { state.opens += 1; state.active = true; panel.hidden = false; };
  const closeWidget = () => { state.closes += 1; state.active = false; panel.hidden = true; };
  window.leadConnector = { chatWidget: { openWidget, closeWidget, isActive: () => state.active } };
  shadow.getElementById('launcher').addEventListener('click', openWidget);
  shadow.getElementById('close').addEventListener('click', closeWidget);
  window.dispatchEvent(new CustomEvent('LC_chatWidgetLoaded'));
})();`;

const fulfillProvider = (route: Route) =>
  route.fulfill({ contentType: 'application/javascript', body: providerDouble });

const mockProvider = async (page: Page) => {
  await page.route(loaderUrl, fulfillProvider);
};

const navigatePublic = async (page: Page, path: string) => {
  if (path === '/') {
    await page.locator('[data-site-header] .brand-link').click();
  } else {
    const headerLink = page.locator(`[data-site-nav] a[href="${path}"]`).first();
    const quoteLink = page.locator(`[data-site-header] .nav-actions a[href="${path}"]`).first();
    if (await headerLink.isVisible()) {
      await headerLink.click();
    } else if (await quoteLink.isVisible()) {
      await quoteLink.click();
    } else {
      await page.locator('[data-nav-toggle]').click();
      await page.locator(`[data-mobile-drawer] a[href="${path}"]`).first().click();
    }
  }
  await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/' : path}/?$`));
};

const addChatTrigger = (page: Page) =>
  page.evaluate(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.openPrvnChat = '';
    button.textContent = 'Test custom chat trigger';
    button.style.cssText = 'position:fixed;top:120px;left:10px;z-index:1000';
    document.body.append(button);
  });

test.describe('enabled local LeadConnector adapter', () => {
  test.skip(!enabledFixture, 'Real deployment checks run without fixture identifiers or provider mocks.');

  test('renders the supplied embed once and preserves its conversation through public navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await mockProvider(page);
    await page.goto('/');
    const root = page.locator('[data-leadconnector-root]');
    const loader = page.locator('#prvn-leadconnector-loader');
    await expect(root).toHaveCount(1);
    await expect(loader).toHaveCount(1);
    await expect(loader).toHaveAttribute('src', loaderUrl);
    await expect(loader).toHaveAttribute('async', '');
    await expect(loader).toHaveAttribute(
      'data-resources-url',
      'https://widgets.leadconnectorhq.com/chat-widget/loader.js'
    );
    if (embed === 'gtm') {
      await expect(root.locator('[data-chat-widget]')).toHaveAttribute('data-widget-id', localWidgetId);
      await expect(root.locator('[data-chat-widget]')).toHaveAttribute('data-location-id', localLocationId);
      await expect(loader).toHaveAttribute('data-widget-id', localWidgetId);
    } else {
      await expect(root.locator('chat-widget')).toHaveAttribute('location-id', localLocationId);
      await expect(root.locator('[data-chat-widget]')).toHaveCount(0);
    }
    await expect(root.locator('chat-widget')).toHaveCount(1);
    await page.evaluate(() => {
      window.__prvnChatTestRoot = document.querySelector('[data-leadconnector-root]')!;
      window.__prvnChatTestDocument = document;
    });
    await page.getByRole('button', { name: 'Open mock PRVN chat' }).click();
    await expect(page.getByRole('dialog', { name: 'Mock PRVN chat' })).toBeVisible();

    for (const path of ['/services', '/gallery', '/quote', '/']) {
      await navigatePublic(page, path);
      await expect(root).toHaveCount(1);
      await expect(loader).toHaveCount(1);
      await expect(root.locator('chat-widget')).toHaveCount(1);
      await expect(page.getByRole('dialog', { name: 'Mock PRVN chat' })).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            window.__prvnChatTestRoot === document.querySelector('[data-leadconnector-root]') &&
            window.__prvnChatTestDocument === document
        )
      ).toBe(true);
      expect(await page.evaluate(() => window.__prvnChatTest?.loaderRuns)).toBe(1);
    }

    await page.getByRole('button', { name: 'Close mock PRVN chat' }).click();
    await navigatePublic(page, '/gallery');
    await navigatePublic(page, '/');
    await expect(page.getByRole('dialog', { name: 'Mock PRVN chat' })).toBeHidden();
    await addChatTrigger(page);
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    await expect(page.getByRole('dialog', { name: 'Mock PRVN chat' })).toBeVisible();
    expect(await page.evaluate(() => window.__prvnChatTest?.opens)).toBe(2);
    expect(errors).toEqual([]);
  });

  test('readiness and delegated triggers fail safely when the provider is unavailable or throws', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let releaseLoader: (() => void) | undefined;
    const released = new Promise<void>((resolve) => {
      releaseLoader = resolve;
    });
    await page.route(loaderUrl, async (route) => {
      await released;
      await fulfillProvider(route);
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#prvn-leadconnector-loader')).toHaveCount(1);
    await addChatTrigger(page);
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    expect(await page.evaluate(() => window.__prvnChatTest)).toBeUndefined();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('LC_chatWidgetLoaded')));
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    releaseLoader?.();
    await expect(page.getByRole('button', { name: 'Open mock PRVN chat' })).toBeVisible();
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    expect(await page.evaluate(() => window.__prvnChatTest?.opens)).toBe(1);
    await page.evaluate(() => {
      window.leadConnector = {
        chatWidget: {
          openWidget: () => {
            throw new Error('Local fixture provider failure');
          },
        },
      };
    });
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    await page.evaluate(() => {
      window.leadConnector = undefined;
    });
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    expect(errors).toEqual([]);
  });

  test('a blocked loader leaves navigation and quote controls usable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(loaderUrl, (route) => route.abort('blockedbyclient'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gloss, grit, and concrete armor.' })).toBeVisible();
    await addChatTrigger(page);
    await page.getByRole('button', { name: 'Test custom chat trigger' }).click();
    await navigatePublic(page, '/gallery');
    await navigatePublic(page, '/quote');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[data-step="1"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('crossing into an excluded route unloads third-party state and permits a clean return', async ({ page }) => {
    await mockProvider(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open mock PRVN chat' })).toBeVisible();
    await page.evaluate(() => {
      window.__prvnChatTestDocument = document;
      const link = document.createElement('a');
      link.href = '/admin/login';
      link.textContent = 'Local admin exclusion test';
      link.style.cssText = 'position:fixed;top:120px;left:10px;z-index:1000';
      document.body.append(link);
    });
    await page.getByRole('link', { name: 'Local admin exclusion test' }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await expect(page.locator('[data-leadconnector-root]')).toHaveCount(0);
    await expect(page.locator('#prvn-leadconnector-loader')).toHaveCount(0);
    expect(await page.evaluate(() => window.leadConnector)).toBeUndefined();
    expect(await page.evaluate(() => window.__prvnChatTestDocument)).toBeUndefined();
    await page.getByRole('link', { name: 'Back home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Open mock PRVN chat' })).toBeVisible();
    expect(await page.evaluate(() => window.__prvnChatTest?.loaderRuns)).toBe(1);
  });

  test('launcher and opened panel fit above the conversion dock and app deck at required widths', async ({ page }) => {
    await mockProvider(page);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const launcher = page.getByRole('button', { name: 'Open mock PRVN chat' });
      await expect(launcher).toBeVisible();
      await expect
        .poll(async () => {
          const launcherBox = await launcher.boundingBox();
          if (!launcherBox) return false;
          const bottomControls = page.locator('[data-conversion-dock], [data-mobile-app-deck]');
          const controlBoxes = await Promise.all((await bottomControls.all()).map((control) => control.boundingBox()));
          return (
            launcherBox.x >= 0 &&
            launcherBox.y >= 0 &&
            launcherBox.x + launcherBox.width <= width &&
            launcherBox.y + launcherBox.height <= 844 &&
            controlBoxes.every((box) => !box || launcherBox.y + launcherBox.height <= box.y - 8)
          );
        })
        .toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await launcher.click();
      const panel = page.getByRole('dialog', { name: 'Mock PRVN chat' });
      await expect(panel).toBeVisible();
      const panelBox = await panel.boundingBox();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.x).toBeGreaterThanOrEqual(0);
      expect(panelBox!.y).toBeGreaterThanOrEqual(0);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(width);
      expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(844);
      await page.getByRole('button', { name: 'Close mock PRVN chat' }).click();

      const dock = page.locator('[data-conversion-dock]');
      if (await dock.isVisible()) {
        await page.evaluate(() => {
          window.__prvnChatTestDockClicks = [];
          document.querySelector('[data-conversion-dock]')?.addEventListener('click', (event) => {
            const link = (event.target as Element).closest<HTMLAnchorElement>('a');
            if (link && /^(tel|sms):/.test(link.href)) {
              event.preventDefault();
              window.__prvnChatTestDockClicks?.push(link.dataset.cta ?? '');
            }
          });
        });
        await dock.getByRole('link', { name: 'Call PRVN' }).click();
        await dock.getByRole('link', { name: 'Text PRVN' }).click();
        expect(await page.evaluate(() => window.__prvnChatTestDockClicks)).toEqual(['call', 'text']);
        await dock.getByRole('link', { name: 'Get a quote' }).click();
        await expect(page).toHaveURL(/\/quote\/?$/);
        await expect(page.locator('form')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open mock PRVN chat' })).toBeVisible();
      }
    }
  });
});

test.describe('private route exclusion', () => {
  for (const path of ['/admin', '/admin/login', '/admin/estimates', '/admin/estimate-builder', '/admin/settings']) {
    test(`does not render or request LeadConnector on ${path}`, async ({ page }) => {
      const providerRequests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('leadconnectorhq.com')) providerRequests.push(request.url());
      });
      await page.goto(path);
      await expect(page.locator('[data-leadconnector-root], chat-widget, [data-chat-widget]')).toHaveCount(0);
      await expect(page.locator('script[src*="leadconnectorhq.com"]')).toHaveCount(0);
      expect(providerRequests).toEqual([]);
    });
  }
});

test.describe('disabled real configuration', () => {
  test.skip(enabledFixture, 'Disabled configuration is verified against a disabled build or real deployment.');

  test('public pages remain widget-free and usable without fabricated provider acceptance', async ({ page }) => {
    const providerRequests: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('leadconnectorhq.com')) providerRequests.push(request.url());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of ['/', '/services', '/gallery', '/quote', '/contact']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('[data-leadconnector-root], chat-widget, [data-chat-widget]')).toHaveCount(0);
      await expect(page.locator('script[src*="leadconnectorhq.com"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    expect(providerRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
});
