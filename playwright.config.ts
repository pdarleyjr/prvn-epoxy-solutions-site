import { defineConfig, devices } from '@playwright/test';

const liveSiteUrl = process.env.LIVE_SITE_URL;
const chatTestEnabled =
  !liveSiteUrl && process.env.PRVN_CHAT_ARCHITECTURE === 'true' && process.env.PLAYWRIGHT_CHAT_DISABLED !== 'true';
process.env.PRVN_CHAT_TEST_ENABLED = String(chatTestEnabled);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: chatTestEnabled ? '**/leadconnector-architecture.spec.ts' : '**/*.spec.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: liveSiteUrl || 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: liveSiteUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4321',
        url: 'http://127.0.0.1:4321',
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          PUBLIC_LEADCONNECTOR_ENABLED: String(chatTestEnabled),
          PUBLIC_LEADCONNECTOR_EMBED: chatTestEnabled ? process.env.PRVN_CHAT_TEST_EMBED || 'gtm' : '',
          PUBLIC_LEADCONNECTOR_LOCATION_ID: chatTestEnabled ? 'local-test-location-id' : '',
          PUBLIC_LEADCONNECTOR_WIDGET_ID: chatTestEnabled ? 'local-test-widget-id' : '',
        },
      },
});
