// CareBridge: Test coverage for this module behavior.
import { expect, test } from '@playwright/test';
import { installDefaultApiMocks, seedAuthStorage } from './helpers';

async function attach(page: any, name: string) {
  await test.info().attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test.describe('Settings switches (visual)', () => {
  test.use({ colorScheme: 'dark' });

  test('Notification switches render + animate correctly', async ({ page }) => {
    await seedAuthStorage(page);
    await installDefaultApiMocks(page);

    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Notifications' }).click();
    await expect(page.locator('#settings-panel-notifications')).toBeVisible();

    const labels = [
      'Push Notifications on This Device',
      'New Consent Requests',
      'Data Access Logs',
      'Consent Expiry Reminders',
    ];

    await attach(page, 'notifications-initial');

    for (const label of labels) {
      // eslint-disable-next-line no-await-in-loop
      await test.step(label, async () => {
        const sw = page.getByRole('switch', { name: label });
        await expect(sw).toBeVisible();
        await sw.scrollIntoViewIfNeeded();

        const disabled = await sw.isDisabled();
        if (disabled) {
          await attach(page, `notifications-disabled-${label.replace(/\W+/g, '_')}`);
          return;
        }

        const before = await sw.getAttribute('aria-checked');
        await sw.click();
        await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
        await attach(page, `notifications-after-toggle-${label.replace(/\W+/g, '_')}`);
      });
    }
  });
});
