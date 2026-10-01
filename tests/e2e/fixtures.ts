import { expect, test as base } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    // Windows Playwright WebKit crashes in native startViewTransition before Astro
    // swaps documents. Exercise Astro's documented fallback on that emulator only;
    // Linux CI WebKit retains native transitions and every assertion still runs.
    if (process.platform === 'win32' && browserName === 'webkit') {
      await page.addInitScript(() => {
        Object.defineProperty(Document.prototype, 'startViewTransition', {
          value: undefined,
          configurable: true,
        });
      });
    }
    await use(page);
  },
});
