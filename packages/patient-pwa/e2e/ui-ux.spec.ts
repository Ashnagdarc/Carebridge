import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, installDefaultApiMocks, seedAuthStorage } from './helpers';

async function attachScreenshot(page: any, name: string) {
  await test.info().attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

async function assertNoHorizontalOverflow(page: any) {
  const metrics = await expectNoHorizontalOverflow(page);
  expect(metrics.maxWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

test('Typography + base layout (public)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible();

  const fontFamily = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
  expect(fontFamily).toContain('-apple-system');

  await assertNoHorizontalOverflow(page);
  await attachScreenshot(page, 'public-home');
});

test('Landing CTA: Get Started routes to signup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test.describe('Dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('Form input text is readable while typing', async ({ page }) => {
    await page.goto('/signup');
    const input = page.getByLabel('Confirm Password');
    await input.click();
    await input.type('Password123!');

    const styles = await input.evaluate((el) => {
      const computed = window.getComputedStyle(el as HTMLInputElement);
      return { color: computed.color, backgroundColor: computed.backgroundColor };
    });

    expect(styles.backgroundColor).not.toBe('rgb(255, 255, 255)');
    expect(styles.color).not.toBe(styles.backgroundColor);
  });
});

test('Auth pages: navigation + tap targets', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

  const signInButton = page.getByRole('button', { name: /sign in/i });
  const signInBox = await signInButton.boundingBox();
  expect(signInBox?.height || 0).toBeGreaterThanOrEqual(40);

  const createAccountLink = page.getByRole('link', { name: /create/i });
  await createAccountLink.click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

  const signInLink = page.getByRole('link', { name: /sign in/i });
  await signInLink.click();
  await expect(page).toHaveURL(/\/login$/);

  await assertNoHorizontalOverflow(page);
  await attachScreenshot(page, 'auth-login');
});

test('Authed navigation: tabs + headings + icons', async ({ page }) => {
  await seedAuthStorage(page);
  await installDefaultApiMocks(page);

  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();

  // Icons should render as SVGs (Heroicons)
  await expect(nav.locator('svg')).toHaveCount(4);

  await nav.getByRole('link', { name: /Inbox/ }).click();
  await expect(page).toHaveURL(/\/consents$/);
  await expect(page.getByText('Consent Requests')).toBeVisible();
  await attachScreenshot(page, 'authed-inbox');

  await nav.getByRole('link', { name: /History/ }).click();
  await expect(page).toHaveURL(/\/consents\/history$/);
  await expect(page.getByText('Consent History')).toBeVisible();
  await attachScreenshot(page, 'authed-history');

  await nav.getByRole('link', { name: /Settings/ }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await attachScreenshot(page, 'authed-settings');

  await nav.getByRole('link', { name: /Home/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await assertNoHorizontalOverflow(page);
});

test('All key pages: responsive smoke (no horizontal scroll)', async ({ page }) => {
  await seedAuthStorage(page);
  await installDefaultApiMocks(page);

  const routes = [
    '/',
    '/login',
    '/signup',
    '/dashboard',
    '/consents',
    '/consents/approve/consent-req-1',
    '/consents/history',
    '/settings',
  ];

  for (const route of routes) {
    // eslint-disable-next-line no-await-in-loop
    await test.step(route, async () => {
      await page.goto(route);
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, `page-${route.replace(/\W+/g, '_')}`);
    });
  }
});
