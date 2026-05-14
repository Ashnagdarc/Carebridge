// CareBridge: CareBridge application source file.
import type { Page, Route } from '@playwright/test';

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

export const mockLogin: LoginResponse = {
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

async function fulfillPreflight(route: Route) {
  await route.fulfill({
    status: 204,
    headers: withCorsHeaders(),
    body: '',
  });
}

type ProfileMockMode = 'authed' | 'unauthed';

async function installProfileMocks(page: Page, mode: ProfileMockMode) {
  await page.route('**/api/v1/patients/profile', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    const method = route.request().method();

    if (mode === 'unauthed') {
      // Make auth bootstrap fast: the app should clear session and render public pages.
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: withCorsHeaders(),
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: withCorsHeaders(),
        body: JSON.stringify({
          id: mockLogin.patient.id,
          email: mockLogin.patient.email,
          firstName: mockLogin.patient.firstName,
          lastName: mockLogin.patient.lastName,
          externalId: mockLogin.patient.externalId,
        }),
      });
      return;
    }

    if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: withCorsHeaders(),
        body: JSON.stringify({
          id: mockLogin.patient.id,
          email: mockLogin.patient.email,
          firstName: 'Updated',
          lastName: 'User',
          externalId: mockLogin.patient.externalId,
        }),
      });
      return;
    }

    return route.fallback();
  });
}

export async function seedAuthStorage(page: Page) {
  await page.addInitScript((payload) => {
    // Cookie-auth: seed only cached user profile, never tokens.
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

export async function installUnauthedBootstrapMocks(page: Page) {
  await installProfileMocks(page, 'unauthed');
}

export async function installAuthedBootstrapMocks(page: Page) {
  await installProfileMocks(page, 'authed');
}

export async function installDefaultApiMocks(page: Page) {
  const now = new Date();
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Auth bootstrap (cookie session)
  await installAuthedBootstrapMocks(page);

  await page.route('**/api/v1/consent/requests/pending', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify([
        {
          id: 'consent-req-1',
          patientId: mockLogin.patient.id,
          requestingHospitalId: 'hospital-a',
          dataType: 'allergies,medications',
          description: 'Specialist review',
          status: 'pending',
          createdAt: now.toISOString(),
          requestingHospital: { id: 'hospital-a', name: 'Hospital A', code: 'HOSPITAL_A' },
        },
      ]),
    });
  });

  await page.route('**/api/v1/consent/requests/*/approve', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/api/v1/consent/requests/*/deny', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/api/v1/consent/records', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify([
        {
          id: 'consent-record-1',
          consentRequestId: 'consent-req-1',
          patientId: mockLogin.patient.id,
          requestingHospitalId: 'hospital-a',
          sourceHospitalId: 'hospital-b',
          dataType: 'allergies',
          accessCount: 1,
          createdAt: now.toISOString(),
          expiresAt: future.toISOString(),
          requestingHospital: { id: 'hospital-a', name: 'Hospital A', code: 'HOSPITAL_A' },
        },
      ]),
    });
  });

  await page.route('**/api/v1/consent/records/*', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'DELETE') return route.fallback();
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

  await page.route('**/api/v1/audit/patient-logs**', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'GET') return route.fallback();
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
            createdAt: now.toISOString(),
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
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: withCorsHeaders(),
      body: JSON.stringify([{ id: 'hospital-a', name: 'Hospital A' }]),
    });
  });

  await page.route('**/api/v1/patients/sessions', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'GET') return route.fallback();
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
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            isActive: true,
            isCurrent: true,
          },
        ],
        total: 1,
        activeCount: 1,
      }),
    });
  });

  await page.route('**/api/v1/patients/sessions/*', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    if (route.request().method() !== 'DELETE') return route.fallback();
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

  await page.route('**/api/v1/patients/logout', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

  await page.route('**/api/v1/patients/sessions/logout-all', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

  await page.route('**/api/v1/patients/account', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

  await page.route('**/api/v1/patients/password', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await route.fulfill({ status: 204, headers: withCorsHeaders(), body: '' });
  });

}

export async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const el = document.documentElement;
    return {
      innerWidth: window.innerWidth,
      scrollWidth: el.scrollWidth,
      bodyScrollWidth: document.body?.scrollWidth ?? 0,
    };
  });
  const maxWidth = Math.max(result.scrollWidth, result.bodyScrollWidth);
  return { ...result, maxWidth };
}
