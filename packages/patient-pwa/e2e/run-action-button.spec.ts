import { test, expect } from '@playwright/test';
import { installUnauthedBootstrapMocks } from './helpers';

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';

test.describe('RunActionButton visuals', () => {
  test('login: shows idle then running label', async ({ page }) => {
    await installUnauthedBootstrapMocks(page);
    await page.goto(`${BASE}/login`);
    // intercept API POSTs and delay so animation is visible before navigation
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        await new Promise((r) => setTimeout(r, 1500));
      }
      await route.continue();
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // fill credentials so client submits normally
    await page.fill('input[placeholder="you@example.com"]', 'test@dev.local');
    // prefer filling password by type first to avoid placeholder formatting issues
    try {
      await page.fill('input[type=password]', 'Password123!');
    } catch (e) {
      await page.fill('input[placeholder="• • • • • • • •"]', 'Password123!');
    }

    const idleBtn = page.locator('button[data-testid="run-action-idle"]').first();
    await expect(idleBtn).toBeVisible({ timeout: 15000 });
    await idleBtn.screenshot({ path: 'e2e-artifacts/login-initial.png' });

    await idleBtn.click();
    // wait for running state testid
    const runningLabel = page.locator('[data-testid="run-action-running-label"]');
    await expect(runningLabel).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e-artifacts/login-running.png', fullPage: true });
  });

  test('signup: shows idle then running label', async ({ page }) => {
    await installUnauthedBootstrapMocks(page);
    // delay POSTs so animation is visible
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        await new Promise((r) => setTimeout(r, 1200));
      }
      await route.continue();
    });
    await page.goto(`${BASE}/signup`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // fill signup fields (name, email, password, confirm)
    await page.fill('input[placeholder="John Doe"]', 'Test User').catch(() => {});
    await page.fill('input[placeholder="you@example.com"]', 'new@dev.local');
    // fill both password inputs (first and confirm)
    const pwLocators = page.locator('input[type=password]');
    await pwLocators.first().fill('Password123!');
    await pwLocators.nth(1).fill('Password123!');

    const idleBtn2 = page.locator('button[data-testid="run-action-idle"]').first();
    await expect(idleBtn2).toBeVisible({ timeout: 15000 });
    await idleBtn2.screenshot({ path: 'e2e-artifacts/signup-initial.png' });

    await idleBtn2.click();
    const runningLabel2 = page.locator('[data-testid="run-action-running-label"]');
    await expect(runningLabel2).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e-artifacts/signup-running.png', fullPage: true });
  });

  test('forgot-password: shows idle then running label', async ({ page }) => {
    await installUnauthedBootstrapMocks(page);
    await page.goto(`${BASE}/forgot-password`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.fill('input[placeholder="you@example.com"]', 'reset@dev.local');

    const idleBtn3 = page.locator('button[data-testid="run-action-idle"]').first();
    await expect(idleBtn3).toBeVisible({ timeout: 15000 });
    await idleBtn3.screenshot({ path: 'e2e-artifacts/forgot-initial.png' });

    await idleBtn3.click();
    const runningLabel3 = page.locator('[data-testid="run-action-running-label"]');
    await expect(runningLabel3).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e-artifacts/forgot-running.png', fullPage: true });
  });
});
