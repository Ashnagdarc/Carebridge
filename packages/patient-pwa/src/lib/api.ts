import { LoginRequest, SignupRequest, PatientAuthResponse } from '@/types/auth';
import {
  ConsentRequest,
  ConsentRecord,
} from '@/types/consent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export const authApi = {
  async signup(data: SignupRequest): Promise<PatientAuthResponse> {
    const response = await fetch(`${API_URL}/patients/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const result: ApiResponse<PatientAuthResponse> = await response.json();
    if (!result.data) {
      throw new Error('No data returned from signup');
    }

    return result.data;
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
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const result: ApiResponse<PatientAuthResponse> = await response.json();
    if (!result.data) {
      throw new Error('No data returned from login');
    }

    return result.data;
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
    const response = await fetch(`${API_URL}/patients/consent-requests/pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending requests');
    }

    const result: ApiResponse<ConsentRequest[]> = await response.json();
    return result.data || [];
  },

  async getActiveConsents(): Promise<ConsentRecord[]> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/patients/consent-records`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active consents');
    }

    const result: ApiResponse<ConsentRecord[]> = await response.json();
    return result.data || [];
  },

  async approveConsentRequest(
    consentRequestId: string,
    expiryDays: number
  ): Promise<ConsentRecord> {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/patients/consent-requests/${consentRequestId}/approve`,
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
      const error = await response.json();
      throw new Error(error.message || 'Failed to approve consent request');
    }

    const result: ApiResponse<ConsentRecord> = await response.json();
    if (!result.data) {
      throw new Error('No data returned from approval');
    }

    return result.data;
  },

  async denyConsentRequest(consentRequestId: string, reason?: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/patients/consent-requests/${consentRequestId}/deny`,
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
      const error = await response.json();
      throw new Error(error.message || 'Failed to deny consent request');
    }
  },

  async revokeConsent(consentRecordId: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/patients/consent-records/${consentRecordId}/revoke`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to revoke consent');
    }
  },
};
