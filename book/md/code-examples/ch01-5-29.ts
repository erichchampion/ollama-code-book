import { test, expect } from '@playwright/test';

test('CLI should generate code from description', async ({ page }) => {
  // Simulate CLI interaction
  const cli = await startCLI();
  await cli.type('generate a function that validates emails');

  // Wait for AI response
  await page.waitForSelector('.code-output');

  // Verify code was generated
  const code = await page.textContent('.code-output');
  expect(code).toContain('function validateEmail');
  expect(code).toContain('regex');
});