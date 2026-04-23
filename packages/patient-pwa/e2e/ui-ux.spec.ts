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
  await Promise.all([
    page.waitForURL(/\/signup$/),
    page.getByRole('link', { name: 'Get Started' }).click(),
  ]);
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
  await Promise.all([
    page.waitForURL(/\/signup$/),
    createAccountLink.click(),
  ]);
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

  const signInLink = page.getByRole('link', { name: /sign in/i });
  await Promise.all([
    page.waitForURL(/\/login$/),
    signInLink.click(),
  ]);
  await page.waitForLoadState('domcontentloaded');

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

test('Settings: notification toggles work', async ({ page }) => {
  await seedAuthStorage(page);
  await installDefaultApiMocks(page);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('tab', { name: 'Notifications' }).click();
  await expect(page.locator('#settings-panel-notifications')).toBeVisible();

  const pushToggle = page.getByRole('switch', {
    name: 'Push Notifications on This Device',
  });
  await expect(pushToggle).toBeVisible();

  const toggles = [
    { label: 'New Consent Requests' },
    { label: 'Data Access Logs' },
    { label: 'Consent Expiry Reminders' },
  ];

  for (const { label } of toggles) {
    const switch_ = page.getByRole('switch', { name: label });
    await expect(switch_).toBeVisible();
    const before = await switch_.getAttribute('aria-checked');
    await switch_.click();
    await expect(switch_).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
    );
  }

  await attachScreenshot(page, 'settings-toggles-work');
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
