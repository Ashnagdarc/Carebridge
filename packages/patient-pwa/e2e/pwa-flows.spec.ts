// CareBridge: Test coverage for this module behavior.
import { expect, test, type Page } from '@playwright/test';
import { installAuthedBootstrapMocks, installUnauthedBootstrapMocks } from './helpers';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  patient: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    externalId: string;
  };
};

const mockLogin: LoginResponse = {
  accessToken: 'mock_access_token',
  refreshToken: 'mock_refresh_token',
  expiresIn: 3600,
  tokenType: 'Bearer',
  patient: {
    id: 'patient-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    externalId: 'PAT-TEST123',
  },
};

function withCorsHeaders(headers: Record<string, string> = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
}

async function fulfillPreflight(route: any) {
  await route.fulfill({
    status: 204,
    headers: withCorsHeaders(),
    body: '',
  });
}

async function seedAuthStorage(page: Page) {
  await page.addInitScript((payload) => {
    localStorage.setItem(
      'carebridge_user',
      JSON.stringify({
        id: payload.patient.id,
        email: payload.patient.email,
        name: `${payload.patient.firstName} ${payload.patient.lastName}`.trim(),
        firstName: payload.patient.firstName,
        lastName: payload.patient.lastName,
        externalId: payload.patient.externalId,
      }),
    );
  }, mockLogin);
}

test('Login → Dashboard → view ID', async ({ page }) => {
  await installUnauthedBootstrapMocks(page);
  await page.route('**/api/v1/patients/login', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify(mockLogin),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email Address').fill('test@example.com');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Dashboard')).toBeVisible();
  await expect(page.getByText('Patient ID')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy ID' })).toBeVisible();
});

test('Consent Inbox → Approve Request → back to Inbox', async ({ page }) => {
  await seedAuthStorage(page);
  await installAuthedBootstrapMocks(page);

  let approved = false;
  await page.route('**/api/v1/consent/requests/pending', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'GET') return route.fallback();
    const payload = approved
      ? []
      : [
          {
            id: 'consent-req-1',
            patientId: 'patient-1',
            requestingHospitalId: 'hospital-a',
            dataType: 'allergies,medications',
            description: 'Specialist review',
            status: 'pending',
            createdAt: new Date().toISOString(),
            requestingHospital: { id: 'hospital-a', name: 'Hospital A', code: 'HOSPITAL_A' },
          },
        ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify(payload),
    });
  });

  await page.route('**/api/v1/consent/requests/*/approve', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    approved = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify({
        id: 'consent-req-1',
        patientId: 'patient-1',
        requestingHospitalId: 'hospital-a',
        dataType: 'allergies,medications',
        description: 'Approved',
        status: 'approved',
        createdAt: new Date().toISOString(),
        requestingHospital: { id: 'hospital-a', name: 'Hospital A', code: 'HOSPITAL_A' },
      }),
    });
  });

  await page.goto('/consents');
  await expect(page.getByText('Consent Requests')).toBeVisible();
  await expect(page.getByText('Hospital A')).toBeVisible();
  await page.getByRole('button', { name: 'Approve' }).click();

  await expect(page).toHaveURL(/\/consents\/approve\/consent-req-1$/);
  await page.getByRole('button', { name: 'Confirm Approval' }).click();

  await expect(page).toHaveURL(/\/consents$/);
  await expect(page.getByText('No Pending Requests')).toBeVisible();
});

test('Consent History revoke + Settings session management', async ({ page, context }) => {
  await seedAuthStorage(page);
  await installAuthedBootstrapMocks(page);

  await page.route('**/api/v1/consent/records', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify([
        {
          id: 'consent-record-1',
          consentRequestId: 'consent-req-1',
          patientId: 'patient-1',
          requestingHospitalId: 'hospital-a',
          sourceHospitalId: 'hospital-b',
          dataType: 'allergies',
          accessCount: 0,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          requestingHospital: { id: 'hospital-a', name: 'Hospital A', code: 'HOSPITAL_A' },
        },
      ]),
    });
  });

  await page.route('**/api/v1/audit/patient-logs**', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify({
        logs: [
          {
            id: 'log-1',
            action: 'data_accessed',
            resourceType: 'consent_record',
            resourceId: 'consent-record-1',
            hospitalId: 'hospital-a',
            status: 'success',
            details: JSON.stringify({ dataType: 'allergies' }),
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        skip: 0,
        take: 20,
        hasMore: false,
      }),
    });
  });

  await page.route('**/api/v1/hospitals', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify([{ id: 'hospital-a', name: 'Hospital A' }]),
    });
  });

  await page.route('**/api/v1/consent/records/*', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'DELETE') return route.fallback();
    await route.fulfill({
      status: 204,
      headers: withCorsHeaders(),
      body: '',
    });
  });

  await page.goto('/consents/history');
  await expect(page.getByText('Consent History')).toBeVisible();
  await page.getByRole('button', { name: /Active \(1\)/ }).click();
  await page.getByRole('button', { name: /^Revoke$/ }).click();
  await page.getByRole('button', { name: 'Confirm Revoke' }).click();
  await expect(page.getByText('No active consents.')).toBeVisible();

  await page.route('**/api/v1/patients/sessions', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify({
        sessions: [
          {
            id: 'sess_current',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            revokedAt: null,
            ipAddress: '127.0.0.1',
            userAgent: 'Playwright',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            isCurrent: true,
          },
          {
            id: 'sess_other',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            revokedAt: null,
            ipAddress: '10.0.0.2',
            userAgent: 'Other Device',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            isCurrent: false,
          },
        ],
        total: 2,
        activeCount: 2,
      }),
    });
  });

  await page.route('**/api/v1/patients/sessions/*', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'DELETE') return route.fallback();
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Security' }).click();
  await expect(page.getByText(/Active Sessions:/)).toBeVisible();
  await page.getByRole('button', { name: 'View Sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();
  await expect(page.getByText('Current device')).toBeVisible();

  // Offline smoke check: once loaded, the page should not crash when offline.
  await context.setOffline(true);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await context.setOffline(false);
});

test('Password reset link sets a new password', async ({ page }) => {
  await installUnauthedBootstrapMocks(page);
  await page.route('**/api/v1/patients/password-reset/confirm', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({
      status: 204,
      headers: withCorsHeaders(),
      body: '',
    });
  });

  await page.goto('/reset-password?token=reset-token-123');
  await expect(page.getByRole('heading', { name: 'Create new password' })).toBeVisible();
  await page.getByLabel('New Password').fill('NewPassword123');
  await page.getByLabel('Confirm Password').fill('NewPassword123');
  await page.getByRole('button', { name: 'Reset password' }).click();

  await expect(page.getByText('Your password has been reset.')).toBeVisible();
});
