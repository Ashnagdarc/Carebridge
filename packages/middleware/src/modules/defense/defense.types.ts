export type DefenseEventType =
  | 'data_request_created'
  | 'consent_request_created'
  | 'consent_approved'
  | 'consent_denied'
  | 'data_request_in_progress'
  | 'data_fetch_started'
  | 'data_delivery_started'
  | 'data_request_completed'
  | 'data_request_failed';

export interface DefenseEvent {
  type: DefenseEventType;
  timestamp: string;
  payload: {
    dataRequestId?: string;
    consentRequestId?: string;
    patientId?: string;
    sourceHospitalId?: string;
    targetHospitalId?: string;
    dataTypes?: string[];
    purpose?: string | null;
    status?: string;
    failureReason?: string;
    latencyMs?: number;
    [key: string]: unknown;
  };
}
