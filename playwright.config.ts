import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ollama-code E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for different test scenarios */
  projects: [
    {
      name: 'cli-e2e',
      testMatch: /.*\.e2e\.test\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 60000, // 60 seconds for CLI operations
    },
    {
      name: 'ide-integration',
      testMatch: /.*\.ide\.test\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 120000, // 120 seconds for IDE integration tests
    },
  ],

  /* Test output directory */
  outputDir: 'test-results/',

  /* Global setup/teardown */
  // globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
});
