export type ConsentRequestCreatedNotification = {
  type: 'consent_request_created';
  data: {
    consentRequestId: string;
    patientId: string;
    hospital: {
      id: string;
      name: string;
    };
    scopes: string[];
    clinicalReason: string;
    createdAt: string;
  };
};

export type CareBridgeNotificationEvent = ConsentRequestCreatedNotification;

