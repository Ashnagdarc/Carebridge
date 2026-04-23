import {
  LoginRequest,
  SignupRequest,
  PatientAuthResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RequestPasswordResetRequest,
  ConfirmPasswordResetRequest,
  PatientSessionListResponse,
  PatientSession,
} from '@/types/auth';
import {
  ConsentRequest,
  ConsentRecord,
  ConsentScope,
  HospitalInfo,
  AccessLogEntry,
} from '@/types/consent';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const API_URL = /\/api\/v\d+$/.test(API_ORIGIN)
  ? API_ORIGIN
  : `${API_ORIGIN}/api/${API_VERSION}`;

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface BackendPatientAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  patient: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    externalId: string;
  };
}

interface BackendPatientProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  externalId: string;
}

interface BackendPatientSession {
  id: string;
  expiresAt: string | Date;
  revokedAt: string | Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  isActive: boolean;
  isCurrent: boolean;
}

interface BackendPatientSessionListResponse {
  sessions: BackendPatientSession[];
  total: number;
  activeCount: number;
}

interface BackendConsentRequest {
  id: string;
  patientId: string;
  requestingHospitalId: string;
  dataType: string;
  description?: string | null;
  status: 'pending' | 'approved' | 'denied' | 'rejected' | 'expired';
  expiresAt?: string | Date | null;
  createdAt?: string | Date;
  requestingHospital?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface BackendConsentRecord {
  id: string;
  consentRequestId: string;
  patientId: string;
  requestingHospitalId: string;
  sourceHospitalId: string;
  dataType: string;
  accessCount: number;
  lastAccessedAt?: string | Date | null;
  revokedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
  requestingHospital?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface BackendAuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  hospitalId?: string;
  status: string;
  details?: string;
  createdAt: string | Date;
}

interface BackendAuditLogListResponse {
  logs: BackendAuditLog[];
  total: number;
  skip: number;
  take: number;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = await response.json();
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message || payload.error || fallback;
    return new Error(message);
  } catch {
    return new Error(fallback);
  }
}

function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof TypeError) return true;
  return false;
}

async function safeFetch(url: string, init: RequestInit, fallback: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(`${fallback}: cannot reach API (${API_URL}). Is the middleware running on port 3000?`);
    }
    throw error;
  }
}

function unwrapResponse<T>(payload: ApiResponse<T> | T): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as ApiResponse<T>).data !== undefined
  ) {
    return (payload as ApiResponse<T>).data as T;
  }

  return payload as T;
}

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Patient';
  const lastName = parts.slice(1).join(' ') || 'Patient';

  return { firstName, lastName };
}

function mapPatientAuthResponse(response: BackendPatientAuthResponse): PatientAuthResponse {
  const { patient } = response;

  return {
    id: patient.id,
    email: patient.email,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    firstName: patient.firstName,
    lastName: patient.lastName,
    externalId: patient.externalId,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken || '',
    expiresIn: response.expiresIn,
    tokenType: response.tokenType,
  };
}

function toIsoString(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.toISOString();
}

function mapPatientSession(session: BackendPatientSession): PatientSession {
  return {
    id: session.id,
    expiresAt: toIsoString(session.expiresAt) || new Date().toISOString(),
    revokedAt: toIsoString(session.revokedAt) || null,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: toIsoString(session.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(session.updatedAt) || new Date().toISOString(),
    isActive: session.isActive,
    isCurrent: session.isCurrent,
  };
}

function scopesFromDataType(dataType?: string): ConsentScope[] {
  if (!dataType) return [];

  return dataType
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({
      id: name,
      name,
      description: `${name.replace(/_/g, ' ')} data`,
    }));
}

function hospitalFromBackend(
  hospitalId: string,
  hospital?: BackendConsentRequest['requestingHospital']
): HospitalInfo {
  return {
    id: hospital?.id || hospitalId,
    name: hospital?.name || hospital?.code || hospitalId,
  };
}

function normalizeRequestStatus(status: BackendConsentRequest['status']): ConsentRequest['status'] {
  return status === 'rejected' ? 'denied' : status;
}

function mapConsentRequest(request: BackendConsentRequest): ConsentRequest {
  const hospital = hospitalFromBackend(
    request.requestingHospitalId,
    request.requestingHospital
  );

  return {
    id: request.id,
    patientId: request.patientId,
    hospitalId: request.requestingHospitalId,
    hospital,
    scopes: scopesFromDataType(request.dataType),
    clinicalReason: request.description || 'Healthcare data request',
    requestedAt: toIsoString(request.createdAt) || new Date().toISOString(),
    expiresAt: toIsoString(request.expiresAt),
    status: normalizeRequestStatus(request.status),
    dataType: request.dataType,
    description: request.description || undefined,
  };
}

function mapConsentRecord(record: BackendConsentRecord): ConsentRecord {
  const hospital = hospitalFromBackend(
    record.requestingHospitalId,
    record.requestingHospital
  );
  const expiresAt = toIsoString(record.expiresAt);
  const revokedAt = toIsoString(record.revokedAt);
  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;

  return {
    id: record.id,
    consentRequestId: record.consentRequestId,
    patientId: record.patientId,
    hospitalId: record.requestingHospitalId,
    hospital,
    scopes: scopesFromDataType(record.dataType),
    approvedAt: toIsoString(record.createdAt) || new Date().toISOString(),
    expiresAt,
    status: revokedAt ? 'revoked' : isExpired ? 'expired' : 'active',
    accessCount: record.accessCount,
    lastAccessedAt: toIsoString(record.lastAccessedAt),
    revokedAt,
  };
}

function mapAccessLogEntry(log: BackendAuditLog): AccessLogEntry {
  return {
    id: log.id,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    hospitalId: log.hospitalId,
    status: log.status,
    details: log.details,
    createdAt: toIsoString(log.createdAt) || new Date().toISOString(),
  };
}

export const authApi = {
  async signup(data: SignupRequest): Promise<PatientAuthResponse> {
    const { firstName, lastName } = splitFullName(data.name);
    const response = await safeFetch(`${API_URL}/patients/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email: data.email,
        password: data.password,
      }),
    }, 'Signup failed');

    if (!response.ok) {
      throw await readError(response, 'Signup failed');
    }

    const result = unwrapResponse<BackendPatientAuthResponse | BackendPatientProfile>(
      await response.json()
    );

    if (result && typeof result === 'object' && 'accessToken' in result) {
      return mapPatientAuthResponse(result as BackendPatientAuthResponse);
    }

    // Backend signup can return only a profile (no tokens). Ensure the frontend has tokens
    // by performing an immediate login.
    return this.login({ email: data.email, password: data.password });
  },

  async login(credentials: LoginRequest): Promise<PatientAuthResponse> {
    const response = await safeFetch(`${API_URL}/patients/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }, 'Login failed');

    if (!response.ok) {
      throw await readError(response, 'Login failed');
    }

    const result = unwrapResponse<BackendPatientAuthResponse>(await response.json());
    return mapPatientAuthResponse(result);
  },

  async logout(token: string): Promise<void> {
    await fetch(`${API_URL}/patients/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async updateProfile(data: UpdateProfileRequest): Promise<PatientAuthResponse> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await readError(response, 'Profile update failed');
    }

    const result = unwrapResponse<BackendPatientAuthResponse>(await response.json());
    return mapPatientAuthResponse(result);
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await readError(response, 'Password change failed');
    }
  },

  async requestPasswordReset(data: RequestPasswordResetRequest): Promise<void> {
    const response = await safeFetch(`${API_URL}/patients/password-reset/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, 'Password reset request failed');

    if (!response.ok) {
      throw await readError(response, 'Password reset request failed');
    }
  },

  async confirmPasswordReset(data: ConfirmPasswordResetRequest): Promise<void> {
    const response = await safeFetch(`${API_URL}/patients/password-reset/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, 'Password reset failed');

    if (!response.ok) {
      throw await readError(response, 'Password reset failed');
    }
  },

  getToken(): string {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('carebridge_access_token');
    return stored || '';
  },

  async signOutAll(): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/sessions/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, 'Failed to sign out all sessions');
    }
  },

  async deleteAccount(): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, 'Failed to delete account');
    }
  },

  async getSessions(): Promise<PatientSessionListResponse> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, 'Failed to fetch sessions');
    }

    const result = unwrapResponse<BackendPatientSessionListResponse>(await response.json());

    return {
      sessions: (result.sessions || []).map(mapPatientSession),
      total: result.total ?? result.sessions?.length ?? 0,
      activeCount:
        typeof result.activeCount === 'number'
          ? result.activeCount
          : (result.sessions || []).filter((s) => s.isActive).length,
    };
  },

  async revokeSession(sessionId: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, 'Failed to revoke session');
    }
  },
};

/**
 * Consent API operations
 */
export const consentApi = {
  getToken(): string {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('carebridge_access_token');
    return stored || '';
  },

  async getPendingRequests(): Promise<ConsentRequest[]> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/consent/requests/pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, 'Failed to fetch pending requests');
    }

    const result = unwrapResponse<{ requests: BackendConsentRequest[] } | BackendConsentRequest[]>(
      await response.json()
    );
    const requests = Array.isArray(result) ? result : result.requests;
    return (requests || []).map(mapConsentRequest);
  },

  async getActiveConsents(): Promise<ConsentRecord[]> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/consent/records`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, 'Failed to fetch active consents');
    }

    const result = unwrapResponse<{ consents: BackendConsentRecord[] } | BackendConsentRecord[]>(
      await response.json()
    );
    const consents = Array.isArray(result) ? result : result.consents;
    return (consents || []).map(mapConsentRecord);
  },

  async approveConsentRequest(
    consentRequestId: string,
    expiryDays: number | 'indefinite'
  ): Promise<ConsentRequest> {
    const token = this.getToken();
    const body =
      expiryDays === 'indefinite'
        ? { indefinite: true }
        : { expiryDays };
    const response = await fetch(
      `${API_URL}/consent/requests/${consentRequestId}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw await readError(response, 'Failed to approve consent request');
    }

    const result = unwrapResponse<BackendConsentRequest>(await response.json());
    return mapConsentRequest(result);
  },

  async denyConsentRequest(consentRequestId: string, reason?: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/consent/requests/${consentRequestId}/deny`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      throw await readError(response, 'Failed to deny consent request');
    }
  },

  async revokeConsent(consentRecordId: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/consent/records/${consentRecordId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw await readError(response, 'Failed to revoke consent');
    }
  },

  async getPatientAccessLogs(skip = 0, take = 20): Promise<{
    logs: AccessLogEntry[];
    total: number;
    skip: number;
    take: number;
    hasMore: boolean;
  }> {
    const token = this.getToken();
    const params = new URLSearchParams({
      skip: String(skip),
      take: String(take),
    });

    const response = await fetch(
      `${API_URL}/audit/patient-logs?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw await readError(response, 'Failed to fetch access logs');
    }

    const result = unwrapResponse<BackendAuditLogListResponse>(await response.json());
    const logs = (result.logs || []).map(mapAccessLogEntry);

    return {
      logs,
      total: result.total || 0,
      skip: result.skip || skip,
      take: result.take || take,
      hasMore: (result.skip || skip) + logs.length < (result.total || 0),
    };
  },

  async getHospitals(): Promise<HospitalInfo[]> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/hospitals`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch hospitals");
    }

    const result = unwrapResponse<{ id: string; name: string; code: string }[]>(
      await response.json()
    );
    return (result || []).map((h) => ({
      id: h.id,
      name: h.name,
    }));
  },
};
