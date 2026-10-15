import { defineConfig, devices } from '@playwright/test';

const port = process.env.STAGE1_PORT ?? '3000';

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
    {name: 'mobile', use: {...devices['Pixel 5'], viewport: {width: 320, height: 800}}},
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node ./node_modules/next/dist/bin/next dev --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    stdout: 'ignore',
    stderr: 'pipe',
    reuseExistingServer: process.env.STAGE1_GATE === '1' || !process.env.CI,
    env: { CATALOG_DATA_MODE: 'demo' },
  },
});
