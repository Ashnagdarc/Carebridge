import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('ConsentService', () => {
  let service: ConsentService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              findUnique: jest.fn(),
            },
            hospital: {
              findUnique: jest.fn(),
            },
            consentRequest: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            consentRecord: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConsentRequest', () => {
    it('should successfully create a consent request', async () => {
      const dto = {
        patientId: 'pat_1',
        requestingHospitalId: 'hosp_1',
        dataType: 'allergies',
        description: 'Patient allergy information',
      };

      const patient = { id: 'pat_1', email: 'patient@example.com' };
      const hospital = { id: 'hosp_1', name: 'Hospital A', isActive: true };
      const consentRequest = {
        id: 'cr_1',
        ...dto,
        status: 'pending',
        approvalCode: 'ABC123XY',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        requestingHospital: { id: 'hosp_1', name: 'Hospital A', code: 'HOSPITAL_A' },
      };

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      prismaService.hospital.findUnique.mockResolvedValue(hospital as any);
      prismaService.consentRequest.create.mockResolvedValue(consentRequest as any);

      const result = await service.createConsentRequest(dto);

      expect(result.id).toBe('cr_1');
      expect(result.status).toBe('pending');
      expect(result.dataType).toBe('allergies');
      expect(prismaService.consentRequest.create).toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      const dto = {
        patientId: 'pat_1',
        requestingHospitalId: '',
        dataType: 'allergies',
      };

      await expect(service.createConsentRequest(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject non-existent patient', async () => {
      const dto = {
        patientId: 'pat_nonexistent',
        requestingHospitalId: 'hosp_1',
        dataType: 'allergies',
      };

      prismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.createConsentRequest(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approveConsentRequest', () => {
    it('should successfully approve a consent request', async () => {
      const consentRequest = {
        id: 'cr_1',
        patientId: 'pat_1',
        requestingHospitalId: 'hosp_1',
        dataType: 'allergies',
        status: 'pending',
        approvalCode: 'ABC123XY',
        expiresAt: new Date(Date.now() + 1000000),
        requestingHospital: { id: 'hosp_1', name: 'Hospital A', code: 'HOSPITAL_A' },
        approvedAt: null,
      };

      const updated = { ...consentRequest, status: 'approved', approvedAt: new Date() };

      prismaService.consentRequest.findUnique.mockResolvedValue(consentRequest as any);
      prismaService.consentRequest.update.mockResolvedValue(updated as any);
      prismaService.consentRecord.create.mockResolvedValue({} as any);

      const result = await service.approveConsentRequest('cr_1', { approvalCode: 'ABC123XY' });

      expect(result.status).toBe('approved');
      expect(prismaService.consentRecord.create).toHaveBeenCalled();
    });

    it('should reject invalid approval code', async () => {
      const consentRequest = {
        id: 'cr_1',
        status: 'pending',
        approvalCode: 'ABC123XY',
        expiresAt: new Date(Date.now() + 1000000),
      };

      prismaService.consentRequest.findUnique.mockResolvedValue(consentRequest as any);

      await expect(
        service.approveConsentRequest('cr_1', { approvalCode: 'WRONGCODE' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject approval of already approved request', async () => {
      const consentRequest = {
        id: 'cr_1',
        status: 'approved',
        approvalCode: 'ABC123XY',
      };

      prismaService.consentRequest.findUnique.mockResolvedValue(consentRequest as any);

      await expect(
        service.approveConsentRequest('cr_1', { approvalCode: 'ABC123XY' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('denyConsentRequest', () => {
    it('should successfully deny a consent request', async () => {
      const consentRequest = {
        id: 'cr_1',
        status: 'pending',
        requestingHospital: { id: 'hosp_1', name: 'Hospital A', code: 'HOSPITAL_A' },
      };

      const updated = { ...consentRequest, status: 'denied', rejectedAt: new Date() };

      prismaService.consentRequest.findUnique.mockResolvedValue(consentRequest as any);
      prismaService.consentRequest.update.mockResolvedValue(updated as any);

      const result = await service.denyConsentRequest('cr_1');

      expect(result.status).toBe('denied');
      expect(prismaService.consentRequest.update).toHaveBeenCalled();
    });
  });

  describe('revokeConsent', () => {
    it('should successfully revoke an active consent', async () => {
      const consentRecord = {
        id: 'conc_1',
        patientId: 'pat_1',
        revokedAt: null,
        requestingHospitalId: 'hosp_1',
        dataType: 'allergies',
      };

      const updated = { ...consentRecord, revokedAt: new Date() };

      prismaService.consentRecord.findUnique.mockResolvedValue(consentRecord as any);
      prismaService.consentRecord.update.mockResolvedValue(updated as any);

      const result = await service.revokeConsent('conc_1', 'pat_1');

      expect(result.revokedAt).toBeDefined();
      expect(prismaService.consentRecord.update).toHaveBeenCalled();
    });

    it('should reject revoking consent of another patient', async () => {
      const consentRecord = {
        id: 'conc_1',
        patientId: 'pat_1',
        revokedAt: null,
      };

      prismaService.consentRecord.findUnique.mockResolvedValue(consentRecord as any);

      await expect(service.revokeConsent('conc_1', 'pat_2')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('listPendingConsentRequests', () => {
    it('should list pending requests for a patient', async () => {
      const patient = { id: 'pat_1', email: 'patient@example.com' };
      const requests = [
        {
          id: 'cr_1',
          dataType: 'allergies',
          status: 'pending',
          requestingHospital: { id: 'hosp_1', name: 'Hospital A', code: 'HOSPITAL_A' },
        },
      ];

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      prismaService.consentRequest.findMany.mockResolvedValue(requests as any);

      const result = await service.listPendingConsentRequests('pat_1');

      expect(result.total).toBe(1);
      expect(result.requests.length).toBe(1);
    });
  });

  describe('listActiveConsents', () => {
    it('should list active consents for a patient', async () => {
      const patient = { id: 'pat_1', email: 'patient@example.com' };
      const consents = [
        {
          id: 'conc_1',
          dataType: 'allergies',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 1000000),
        },
      ];

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      prismaService.consentRecord.findMany.mockResolvedValue(consents as any);

      const result = await service.listActiveConsents('pat_1');

      expect(result.total).toBe(1);
      expect(result.consents.length).toBe(1);
    });
  });

  describe('hasActiveConsent', () => {
    it('should return true if active consent exists', async () => {
      const consent = { id: 'conc_1', revokedAt: null };

      prismaService.consentRecord.findFirst.mockResolvedValue(consent as any);

      const result = await service.hasActiveConsent('pat_1', 'hosp_1', 'allergies');

      expect(result).toBe(true);
    });

    it('should return false if no active consent exists', async () => {
      prismaService.consentRecord.findFirst.mockResolvedValue(null);

      const result = await service.hasActiveConsent('pat_1', 'hosp_1', 'allergies');

      expect(result).toBe(false);
    });
  });
});
