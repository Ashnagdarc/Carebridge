// CareBridge: Test coverage for this module behavior.
import { of } from 'rxjs';
import { AuditService } from '../audit/audit.service';
import { ConsentService } from '../consent/consent.service';
import { DataRequestService } from './data-request.service';
import { DataRequestStatus, DataType } from './dto/data-request.dto';

describe('Data request consent-to-routing integration', () => {
  const now = () => new Date();

  function createInMemoryPrisma() {
    const store: {
      patients: any[];
      hospitals: any[];
      consentRequests: any[];
      consentRecords: any[];
      dataRequests: any[];
      auditLogs: any[];
    } = {
      patients: [
        {
          id: 'patient-001',
          email: 'patient-001@example.com',
          firstName: 'Amina',
          lastName: 'Okafor',
        },
      ],
      hospitals: [
        {
          id: 'hospital-a',
          name: 'Hospital A',
          code: 'HOSPITAL_A',
          endpoint: 'http://hospital-a.test',
          isActive: true,
        },
        {
          id: 'hospital-b',
          name: 'Hospital B',
          code: 'HOSPITAL_B',
          endpoint: 'http://hospital-b.test',
          isActive: true,
        },
      ],
      consentRequests: [],
      consentRecords: [],
      dataRequests: [],
      auditLogs: [],
    };

    let consentRequestSequence = 1;
    let consentRecordSequence = 1;
    let dataRequestSequence = 1;
    let auditLogSequence = 1;

    const matchWhere = (record: any, where: any = {}) =>
      Object.entries(where).every(([key, value]: [string, any]) => {
        if (key === 'OR' && Array.isArray(value)) {
          return value.some((condition) => matchWhere(record, condition));
        }

        if (value && typeof value === 'object' && 'gt' in value) {
          return record[key] > value.gt;
        }

        return record[key] === value;
      });

    return {
      store,
      patient: {
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(store.patients.find((patient) => patient.id === where.id) || null),
        ),
      },
      hospital: {
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(
            store.hospitals.find((hospital) =>
              Object.entries(where).every(
                ([key, value]) => hospital[key] === value,
              ),
            ) || null,
          ),
        ),
      },
      consentRequest: {
        create: jest.fn(({ data, include }) => {
          const consentRequest = {
            id: `consent-request-${consentRequestSequence++}`,
            ...data,
            status: data.status || 'pending',
            createdAt: now(),
            updatedAt: now(),
          };

          store.consentRequests.push(consentRequest);

          return Promise.resolve({
            ...consentRequest,
            requestingHospital: include?.requestingHospital
              ? store.hospitals.find(
                  (hospital) => hospital.id === consentRequest.requestingHospitalId,
                )
              : undefined,
          });
        }),
        findUnique: jest.fn(({ where, include }) => {
          const consentRequest =
            store.consentRequests.find((request) => request.id === where.id) ||
            null;

          if (!consentRequest) {
            return Promise.resolve(null);
          }

          return Promise.resolve({
            ...consentRequest,
            requestingHospital: include?.requestingHospital
              ? store.hospitals.find(
                  (hospital) => hospital.id === consentRequest.requestingHospitalId,
                )
              : undefined,
          });
        }),
        update: jest.fn(({ where, data, include }) => {
          const index = store.consentRequests.findIndex(
            (request) => request.id === where.id,
          );
          store.consentRequests[index] = {
            ...store.consentRequests[index],
            ...data,
            updatedAt: now(),
          };

          return Promise.resolve({
            ...store.consentRequests[index],
            requestingHospital: include?.requestingHospital
              ? store.hospitals.find(
                  (hospital) =>
                    hospital.id === store.consentRequests[index].requestingHospitalId,
                )
              : undefined,
          });
        }),
      },
      consentRecord: {
        create: jest.fn(({ data }) => {
          const consentRecord = {
            id: `consent-record-${consentRecordSequence++}`,
            accessCount: 0,
            lastAccessedAt: null,
            revokedAt: null,
            createdAt: now(),
            updatedAt: now(),
            ...data,
          };

          store.consentRecords.push(consentRecord);

          return Promise.resolve(consentRecord);
        }),
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(
            store.consentRecords.find((record) => record.id === where.id) || null,
          ),
        ),
        findFirst: jest.fn(({ where, select }) => {
          const match = store.consentRecords.find((record) => matchWhere(record, where)) || null;
          if (!match) return Promise.resolve(null);
          if (select && select.id) return Promise.resolve({ id: match.id });
          return Promise.resolve(match);
        }),
        findMany: jest.fn(({ where }) =>
          Promise.resolve(store.consentRecords.filter((record) => matchWhere(record, where))),
        ),
        update: jest.fn(({ where, data }) => {
          const index = store.consentRecords.findIndex(
            (record) => record.id === where.id,
          );
          store.consentRecords[index] = {
            ...store.consentRecords[index],
            ...data,
            updatedAt: now(),
          };

          return Promise.resolve(store.consentRecords[index]);
        }),
      },
      dataRequest: {
        create: jest.fn(({ data }) => {
          const dataRequest = {
            id: `data-request-${dataRequestSequence++}`,
            ...data,
            requestedAt: data.requestedAt || now(),
            completedAt: null,
            failureReason: null,
            responseData: null,
            consentRecordId: null,
            latencyMs: null,
            createdAt: now(),
            updatedAt: now(),
          };

          store.dataRequests.push(dataRequest);

          return Promise.resolve(dataRequest);
        }),
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(
            store.dataRequests.find((request) => request.id === where.id) || null,
          ),
        ),
        findMany: jest.fn(({ where, select }) => {
          const results = store.dataRequests.filter((request) => matchWhere(request, where));
          if (select && select.id) {
            return Promise.resolve(results.map((r) => ({ id: r.id })));
          }
          return Promise.resolve(results);
        }),
        update: jest.fn(({ where, data }) => {
          const index = store.dataRequests.findIndex(
            (request) => request.id === where.id,
          );
          store.dataRequests[index] = {
            ...store.dataRequests[index],
            ...data,
            updatedAt: now(),
          };

          return Promise.resolve(store.dataRequests[index]);
        }),
      },
      auditLog: {
        create: jest.fn(({ data }) => {
          const auditLog = {
            id: `audit-log-${auditLogSequence++}`,
            ...data,
            createdAt: now(),
          };

          store.auditLogs.push(auditLog);

          return Promise.resolve(auditLog);
        }),
      },
    };
  }

  it('creates pending consent, approves it, then fetches and delivers patient data', async () => {
    const prisma = createInMemoryPrisma();
    const notificationsService = { notifyPatient: jest.fn() };
    const defenseService = { emit: jest.fn() };
    const httpService = {
      get: jest.fn().mockReturnValue(
        of({
          data: {
            patientId: 'patient-001',
            sourceHospital: 'HOSPITAL_A',
            dataTypes: [DataType.MEDICATIONS, DataType.ALLERGIES],
            data: {
              medications: [{ name: 'Metformin' }],
              allergies: [{ substance: 'Penicillin' }],
            },
          },
        }),
      ),
      post: jest.fn().mockReturnValue(
        of({
          data: {
            status: 'accepted',
            deliveryId: 'delivery-1',
          },
        }),
      ),
    };

    const consentService = new ConsentService(
      prisma as any,
      notificationsService as any,
      defenseService as any,
      { resumePendingRequestsForConsent: jest.fn() } as any,
    );
    const auditService = new AuditService(prisma as any);
    const dataRequestService = new DataRequestService(
      prisma as any,
      consentService,
      auditService,
      httpService as any,
      defenseService as any,
    );
    (consentService as any).dataRequestService = dataRequestService;

    const initialRequest = await dataRequestService.createDataRequest(
      {
        patientId: 'patient-001',
        sourceHospitalId: 'hospital-b',
        targetHospitalId: 'hospital-a',
        dataTypes: [DataType.MEDICATIONS, DataType.ALLERGIES],
        purpose: 'Specialist review',
      },
      'hospital-b',
    );

    expect(initialRequest.status).toBe(DataRequestStatus.PENDING);
    expect(notificationsService.notifyPatient).toHaveBeenCalledWith(
      'patient-001',
      expect.objectContaining({
        type: 'consent_request_created',
      }),
    );

    const consentRequest = prisma.store.consentRequests[0];
    await consentService.approveConsentRequest(consentRequest.id, {
      approvalCode: consentRequest.approvalCode,
    });

    const completedRequest = await dataRequestService.createDataRequest(
      {
        patientId: 'patient-001',
        sourceHospitalId: 'hospital-b',
        targetHospitalId: 'hospital-a',
        dataTypes: [DataType.MEDICATIONS, DataType.ALLERGIES],
        purpose: 'Specialist review after approval',
      },
      'hospital-b',
    );

    expect(completedRequest.status).toBe(DataRequestStatus.COMPLETED);
    expect(completedRequest.latencyMs).toEqual(expect.any(Number));
    expect(completedRequest.latencyMs).toBeGreaterThanOrEqual(0);
    expect(completedRequest.latencyMs).toBeLessThanOrEqual(5000);
    expect(completedRequest.responseData).toEqual(
      expect.objectContaining({
        retrievedFrom: 'hospital-a',
        deliveredTo: 'hospital-b',
        deliveryReceipt: {
          status: 'accepted',
          deliveryId: 'delivery-1',
        },
      }),
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'http://hospital-a.test/api/v1/patient-data/patient-001',
      expect.objectContaining({
        params: { dataTypes: 'medications,allergies' },
      }),
    );
    expect(httpService.post).toHaveBeenCalledWith(
      'http://hospital-b.test/api/v1/data-delivery',
      expect.objectContaining({
        patientId: 'patient-001',
        sourceHospital: 'HOSPITAL_A',
      }),
      expect.any(Object),
    );
    expect(prisma.store.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'data_request_created_pending_consent',
          status: 'success',
        }),
        expect.objectContaining({
          action: 'data_request_completed',
          status: 'success',
        }),
      ]),
    );
  });
});
