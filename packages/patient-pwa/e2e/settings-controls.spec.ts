// CareBridge: Test coverage for this module behavior.
import { expect, test } from '@playwright/test';
import { installDefaultApiMocks, seedAuthStorage } from './helpers';

test('Settings: buttons, dialogs, and toggles are interactive', async ({ page }) => {
  await seedAuthStorage(page);
  await installDefaultApiMocks(page);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Account: Update profile + change password (mismatch + success)
  await expect(page.locator('#settings-panel-account')).toBeVisible();

  await page.getByRole('button', { name: 'Update Profile' }).click();
  await expect(page.getByText('Profile updated successfully')).toBeVisible();

  await page.getByLabel('Current Password').fill('OldPassword123!');
  await page.getByLabel('New Password', { exact: true }).fill('NewPassword123!');
  await page
    .getByLabel('Confirm New Password', { exact: true })
    .fill('DifferentPassword123!');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page.getByText('Passwords do not match')).toBeVisible();

  await page.getByLabel('Confirm New Password', { exact: true }).fill('NewPassword123!');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page.getByText('Password changed successfully')).toBeVisible();

  // Notifications: user-controlled toggles should flip
  await page.getByRole('tab', { name: 'Notifications' }).click();
  await expect(page.locator('#settings-panel-notifications')).toBeVisible();

  for (const label of [
    'New Consent Requests',
    'Data Access Logs',
    'Consent Expiry Reminders',
  ]) {
    const toggle = page.getByRole('switch', { name: label });
    await expect(toggle).toBeVisible();
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
    );
  }

  // Security: sessions dialog + confirm-gated actions
  await page.getByRole('tab', { name: 'Security' }).click();
  await expect(page.locator('#settings-panel-security')).toBeVisible();

  await page.getByRole('button', { name: 'View Sessions' }).click();
  const sessionsDialog = page.getByRole('dialog');
  await expect(sessionsDialog).toBeVisible();
  await expect(sessionsDialog.getByText('Sessions')).toBeVisible();
  await sessionsDialog.getByRole('button', { name: 'Close' }).click();
  await expect(sessionsDialog).toBeHidden();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Sign out of this device');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Sign Out (This Device)' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Sign out of all devices');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Sign Out All Devices' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Delete account');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Delete Account' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
