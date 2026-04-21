/**
 * Consent Management Types
 * Interfaces for consent requests, records, and related operations
 */

export interface ConsentScope {
  id: string;
  name: string; // e.g., "allergies", "medications", "diagnoses"
  description: string;
}

export interface HospitalInfo {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface ConsentRequest {
  id: string;
  patientId: string;
  hospitalId: string;
  hospital: HospitalInfo;
  scopes: ConsentScope[];
  clinicalReason: string;
  requestedAt: string; // ISO date
  expiresAt?: string; // ISO date
  status: "pending" | "approved" | "denied" | "expired";
  dataType?: string;
  description?: string;
}

export interface ConsentRecord {
  id: string;
  patientId: string;
  hospitalId: string;
  hospital: HospitalInfo;
  scopes: ConsentScope[];
  consentRequestId?: string;
  approvedAt: string; // ISO date
  expiresAt: string; // ISO date
  status: "active" | "revoked" | "expired";
  accessCount?: number;
  lastAccessedAt?: string;
  revokedAt?: string;
}

export type ExpiryOption = 7 | 30 | 365 | "custom";
