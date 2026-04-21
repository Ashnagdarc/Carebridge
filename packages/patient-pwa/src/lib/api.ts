import { LoginRequest, SignupRequest, PatientAuthResponse } from '@/types/auth';
import {
  ConsentRequest,
  ConsentRecord,
  ConsentScope,
  HospitalInfo,
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
  const expiresAt = toIsoString(record.expiresAt) || '';
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

export const authApi = {
  async signup(data: SignupRequest): Promise<PatientAuthResponse> {
    const { firstName, lastName } = splitFullName(data.name);
    const response = await fetch(`${API_URL}/patients/signup`, {
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
    });

    if (!response.ok) {
      throw await readError(response, 'Signup failed');
    }

    const result = unwrapResponse<BackendPatientAuthResponse>(await response.json());
    return mapPatientAuthResponse(result);
  },

  async login(credentials: LoginRequest): Promise<PatientAuthResponse> {
    const response = await fetch(`${API_URL}/patients/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

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
    expiryDays: number
  ): Promise<ConsentRequest> {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/consent/requests/${consentRequestId}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expiryDays }),
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
};
