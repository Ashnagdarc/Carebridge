// CareBridge: Test coverage for this module behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { DataRequestService } from './data-request.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { AuditService } from '../audit/audit.service';
import { DefenseService } from '../defense/defense.service';
import { DataRequestStatus, DataType } from './dto/data-request.dto';

describe('DataRequestService', () => {
  let service: DataRequestService;
  let prismaService: any;
  let consentService: jest.Mocked<ConsentService>;
  let auditService: jest.Mocked<AuditService>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataRequestService,
        {
          provide: PrismaService,
          useValue: {
            dataRequest: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            patient: {
              findUnique: jest.fn(),
            },
            hospital: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConsentService,
          useValue: {
            hasActiveConsent: jest.fn(),
            createConsentRequest: jest.fn(),
            recordConsentAccess: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
        {
          provide: DefenseService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataRequestService>(DataRequestService);
    prismaService = module.get(PrismaService) as any;
    consentService = module.get(ConsentService) as jest.Mocked<ConsentService>;
    auditService = module.get(AuditService) as jest.Mocked<AuditService>;
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDataRequest', () => {
    const createDto = {
      patientId: 'pat_1',
      sourceHospitalId: 'hosp_1',
      targetHospitalId: 'hosp_2',
      dataTypes: [DataType.MEDICATIONS, DataType.ALLERGIES],
      purpose: 'Patient transfer',
    };

    it('should reject missing required fields', async () => {
      const invalidDto = {
        patientId: 'pat_1',
        // missing targetHospitalId and dataTypes
      };

      await expect(
        service.createDataRequest(invalidDto as any, 'hosp_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if sourceHospitalId does not match authenticated hospital', async () => {
      await expect(
        service.createDataRequest(createDto, 'different_hosp'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if patient not found', async () => {
      prismaService.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.createDataRequest(createDto, 'hosp_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if target hospital not found', async () => {
      prismaService.patient.findUnique.mockResolvedValue({
        id: 'pat_1',
      });
      prismaService.hospital.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createDataRequest(createDto, 'hosp_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create data request with pending consent if no active consent', async () => {
      const patient = { id: 'pat_1', email: 'patient@example.com' };
      const sourceHospital = { id: 'hosp_1', name: 'Hospital 1' };
      const targetHospital = { id: 'hosp_2', name: 'Hospital 2' };
      const consentRequest = { id: 'consent_req_1' };

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      prismaService.hospital.findUnique
        .mockResolvedValueOnce(targetHospital as any)
        .mockResolvedValueOnce(sourceHospital as any);
      consentService.hasActiveConsent.mockResolvedValue(false);
      consentService.createConsentRequest.mockResolvedValue(
        consentRequest as any,
      );

      const dataRequest = {
        id: 'data_req_1',
        ...createDto,
        status: DataRequestStatus.PENDING,
        requestedAt: new Date(),
      };

      prismaService.dataRequest.create.mockResolvedValue(dataRequest as any);
      prismaService.dataRequest.update.mockResolvedValue(dataRequest as any);

      const result = await service.createDataRequest(createDto, 'hosp_1');

      expect(result.status).toBe(DataRequestStatus.PENDING);
      expect(consentService.createConsentRequest).toHaveBeenCalled();
    });

    it('should require consent for all requested data types before routing', async () => {
      const patient = { id: 'pat_1', email: 'patient@example.com' };
      const sourceHospital = { id: 'hosp_1', name: 'Hospital 1' };
      const targetHospital = { id: 'hosp_2', name: 'Hospital 2' };
      const consentRequest = { id: 'consent_req_2' };

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      prismaService.hospital.findUnique
        .mockResolvedValueOnce(targetHospital as any)
        .mockResolvedValueOnce(sourceHospital as any);

      consentService.hasActiveConsent
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      consentService.createConsentRequest.mockResolvedValue(
        consentRequest as any,
      );

      const dataRequest = {
        id: 'data_req_2',
        ...createDto,
        status: DataRequestStatus.PENDING,
        requestedAt: new Date(),
      };

      prismaService.dataRequest.create.mockResolvedValue(dataRequest as any);
      prismaService.dataRequest.update.mockResolvedValue(dataRequest as any);

      const result = await service.createDataRequest(createDto, 'hosp_1');

      expect(result.status).toBe(DataRequestStatus.PENDING);
      expect(consentService.createConsentRequest).toHaveBeenCalledTimes(1);
      expect(httpService.get).not.toHaveBeenCalled();
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should fetch data from target hospital and deliver it to source hospital if consent exists', async () => {
      const patient = { id: 'pat_1', email: 'patient@example.com' };
      const sourceHospital = {
        id: 'hosp_1',
        name: 'Hospital B',
        endpoint: 'http://hospital-b.test',
      };
      const targetHospital = {
        id: 'hosp_2',
        name: 'Hospital A',
        endpoint: 'http://hospital-a.test',
      };
      const fetchedData = {
        patientId: 'pat_1',
        sourceHospital: 'HOSPITAL_A',
        dataTypes: [DataType.MEDICATIONS, DataType.ALLERGIES],
        data: {
          medications: [],
          allergies: [],
        },
      };
      const deliveryReceipt = {
        status: 'accepted',
        deliveryId: 'delivery-1',
      };

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      prismaService.hospital.findUnique
        .mockResolvedValueOnce(targetHospital as any)
        .mockResolvedValueOnce(sourceHospital as any);
      consentService.hasActiveConsent.mockResolvedValue(true);

      const dataRequest = {
        id: 'data_req_1',
        ...createDto,
        status: DataRequestStatus.PENDING,
        requestedAt: new Date(),
      };

      prismaService.dataRequest.create.mockResolvedValue(dataRequest as any);
      prismaService.dataRequest.update
        .mockResolvedValueOnce({
          ...dataRequest,
          status: DataRequestStatus.IN_PROGRESS,
        } as any)
        .mockImplementationOnce((_args) =>
          Promise.resolve({
            ...dataRequest,
            status: DataRequestStatus.COMPLETED,
            completedAt: new Date(),
            latencyMs: 150,
            responseData: _args.data.responseData,
          } as any),
        );
      httpService.get.mockReturnValue(of({ data: fetchedData }) as any);
      httpService.post.mockReturnValue(of({ data: deliveryReceipt }) as any);

      const result = await service.createDataRequest(createDto, 'hosp_1');

      expect(result.status).toBe(DataRequestStatus.COMPLETED);
      expect(result.responseData.data).toEqual(fetchedData);
      expect(result.responseData.deliveryReceipt).toEqual(deliveryReceipt);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://hospital-a.test/api/v1/patient-data/pat_1',
        expect.objectContaining({
          params: { dataTypes: 'medications,allergies' },
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-hospital-token',
          }),
        }),
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'http://hospital-b.test/api/v1/data-delivery',
        fetchedData,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-hospital-token',
          }),
        }),
      );
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_request_completed',
          status: 'success',
        }),
      );
    });

    it('should surface service unavailable errors from target hospital', async () => {
      prismaService.patient.findUnique.mockResolvedValue({ id: 'pat_1' } as any);
      prismaService.hospital.findUnique
        .mockResolvedValueOnce({ id: 'hosp_2', endpoint: 'http://hospital-a.test' } as any)
        .mockResolvedValueOnce({ id: 'hosp_1', endpoint: 'http://hospital-b.test' } as any);
      consentService.hasActiveConsent.mockResolvedValue(true);

      const dataRequest = {
        id: 'data_req_1',
        ...createDto,
        status: DataRequestStatus.PENDING,
        requestedAt: new Date(),
      };
      prismaService.dataRequest.create.mockResolvedValue(dataRequest as any);
      prismaService.dataRequest.update.mockResolvedValue(dataRequest as any);

      httpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 503 }, message: 'Service Unavailable' })) as any,
      );

      await expect(service.createDataRequest(createDto, 'hosp_1')).rejects.toThrow(
        /service unavailable/i,
      );
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_request_failed',
          status: 'failed',
        }),
      );
    });

    it('should surface authentication failures from target hospital', async () => {
      prismaService.patient.findUnique.mockResolvedValue({ id: 'pat_1' } as any);
      prismaService.hospital.findUnique
        .mockResolvedValueOnce({ id: 'hosp_2', endpoint: 'http://hospital-a.test' } as any)
        .mockResolvedValueOnce({ id: 'hosp_1', endpoint: 'http://hospital-b.test' } as any);
      consentService.hasActiveConsent.mockResolvedValue(true);

      const dataRequest = {
        id: 'data_req_1',
        ...createDto,
        status: DataRequestStatus.PENDING,
        requestedAt: new Date(),
      };
      prismaService.dataRequest.create.mockResolvedValue(dataRequest as any);
      prismaService.dataRequest.update.mockResolvedValue(dataRequest as any);

      httpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 401 }, message: 'Unauthorized' })) as any,
      );

      await expect(service.createDataRequest(createDto, 'hosp_1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getDataRequestById', () => {
    it('should get data request by ID', async () => {
      const request = {
        id: 'data_req_1',
        patientId: 'pat_1',
        status: DataRequestStatus.COMPLETED,
      };

      prismaService.dataRequest.findUnique.mockResolvedValue(request as any);

      const result = await service.getDataRequestById('data_req_1');

      expect(result.id).toBe('data_req_1');
      expect(result.patientId).toBe('pat_1');
    });

    it('should throw error if request not found', async () => {
      prismaService.dataRequest.findUnique.mockResolvedValue(null);

      await expect(service.getDataRequestById('invalid_id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('failPendingRequestsForConsent', () => {
    it('should fail pending requests linked to denied consent', async () => {
      prismaService.dataRequest.findMany.mockResolvedValue([
        { id: 'req_1', patientId: 'pat_1', sourceHospitalId: 'hosp_1' },
        { id: 'req_2', patientId: 'pat_2', sourceHospitalId: 'hosp_2' },
      ]);
      prismaService.dataRequest.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.failPendingRequestsForConsent('cr_1');

      expect(result).toEqual({ failed: 2 });
      expect(prismaService.dataRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            consentRequestId: 'cr_1',
            status: DataRequestStatus.PENDING,
          }),
          data: expect.objectContaining({
            status: DataRequestStatus.FAILED,
            failureReason: 'Consent request denied by patient',
          }),
        }),
      );
      expect(auditService.createAuditLog).toHaveBeenCalledTimes(2);
    });
  });

  describe('listDataRequests', () => {
    it('should list data requests with pagination', async () => {
      const requests: any[] = [
        {
          id: 'data_req_1',
          patientId: 'pat_1',
          status: DataRequestStatus.COMPLETED,
        },
      ];

      prismaService.dataRequest.findMany.mockResolvedValue(requests);
      prismaService.dataRequest.count.mockResolvedValue(1);

      const result = await service.listDataRequests({ skip: 0, take: 50 });

      expect(result.requests.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(50);
    });

    it('should filter by status', async () => {
      prismaService.dataRequest.findMany.mockResolvedValue([]);
      prismaService.dataRequest.count.mockResolvedValue(0);

      await service.listDataRequests({
        status: DataRequestStatus.COMPLETED,
      });

      expect(prismaService.dataRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DataRequestStatus.COMPLETED,
          }),
        }),
      );
    });

    it('should enforce max take limit', async () => {
      prismaService.dataRequest.findMany.mockResolvedValue([]);
      prismaService.dataRequest.count.mockResolvedValue(0);

      await service.listDataRequests({ take: 1000 });

      expect(prismaService.dataRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        }),
      );
    });
  });

  describe('getPatientDataRequests', () => {
    it('should get patient-specific data requests', async () => {
      const requests: any[] = [
        {
          id: 'data_req_1',
          patientId: 'pat_1',
          status: DataRequestStatus.COMPLETED,
        },
      ];

      prismaService.dataRequest.findMany.mockResolvedValue(requests);
      prismaService.dataRequest.count.mockResolvedValue(1);

      const result = await service.getPatientDataRequests('pat_1');

      expect(result.total).toBe(1);
      expect(result.requests.length).toBe(1);
    });
  });

  describe('getHospitalDataRequests', () => {
    it('should get hospital outgoing data requests', async () => {
      const requests: any[] = [
        {
          id: 'data_req_1',
          sourceHospitalId: 'hosp_1',
          status: DataRequestStatus.COMPLETED,
        },
      ];

      prismaService.dataRequest.findMany.mockResolvedValue(requests);
      prismaService.dataRequest.count.mockResolvedValue(1);

      const result = await service.getHospitalDataRequests('hosp_1');

      expect(result.total).toBe(1);
      expect(result.requests.length).toBe(1);
    });
  });

  describe('getIncomingDataRequests', () => {
    it('should get hospital incoming data requests', async () => {
      const requests: any[] = [
        {
          id: 'data_req_1',
          targetHospitalId: 'hosp_2',
          status: DataRequestStatus.PENDING,
        },
      ];

      prismaService.dataRequest.findMany.mockResolvedValue(requests);
      prismaService.dataRequest.count.mockResolvedValue(1);

      const result = await service.getIncomingDataRequests('hosp_2');

      expect(result.total).toBe(1);
      expect(result.requests.length).toBe(1);
    });
  });

  describe('getDataRequestStats', () => {
    it('should calculate statistics', async () => {
      prismaService.dataRequest.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(7) // completed
        .mockResolvedValueOnce(0) // failed
        .mockResolvedValueOnce(0); // timeout

      prismaService.dataRequest.findMany.mockResolvedValue([
        { latencyMs: 100 },
        { latencyMs: 150 },
        { latencyMs: 200 },
        { latencyMs: 120 },
        { latencyMs: 110 },
        { latencyMs: 130 },
        { latencyMs: 140 },
      ]);

      const result = await service.getDataRequestStats('hosp_1');

      expect(result.total).toBe(10);
      expect(result.completed).toBe(7);
      expect(result.averageLatencyMs).toBeGreaterThan(0);
    });
  });
});
