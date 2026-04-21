import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get(PrismaService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should successfully create audit log', async () => {
      const dto = {
        action: 'patient_login',
        resourceType: 'patient',
        resourceId: 'pat_1',
        patientId: 'pat_1',
        status: 'success',
      };

      const auditLog = {
        id: 'log_1',
        ...dto,
        hospitalId: null,
        consentRecordId: null,
        details: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      prismaService.auditLog.create.mockResolvedValue(auditLog as any);

      const result = await service.createAuditLog(dto as any);

      expect(result.id).toBe('log_1');
      expect(result.action).toBe('patient_login');
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      const dto = {
        action: 'patient_login',
        // Missing resourceType and resourceId
        status: 'success',
      };

      await expect(service.createAuditLog(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listAuditLogs', () => {
    it('should list audit logs with pagination', async () => {
      const logs = [
        {
          id: 'log_1',
          action: 'patient_login',
          resourceType: 'patient',
          resourceId: 'pat_1',
          patientId: 'pat_1',
          status: 'success',
          createdAt: new Date(),
        },
      ];

      prismaService.auditLog.findMany.mockResolvedValue(logs as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.listAuditLogs({ skip: 0, take: 50 });

      expect(result.logs.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(50);
    });

    it('should filter logs by action', async () => {
      const logs: any[] = [];
      prismaService.auditLog.findMany.mockResolvedValue(logs);
      prismaService.auditLog.count.mockResolvedValue(0);

      await service.listAuditLogs({ action: 'patient_login' });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: expect.any(Object),
          }),
        }),
      );
    });

    it('should filter logs by date range', async () => {
      const logs: any[] = [];
      prismaService.auditLog.findMany.mockResolvedValue(logs);
      prismaService.auditLog.count.mockResolvedValue(0);

      const startDate = '2026-04-01T00:00:00Z';
      const endDate = '2026-04-30T23:59:59Z';

      await service.listAuditLogs({ startDate, endDate });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });

    it('should enforce max take limit', async () => {
      const logs: any[] = [];
      prismaService.auditLog.findMany.mockResolvedValue(logs);
      prismaService.auditLog.count.mockResolvedValue(0);

      await service.listAuditLogs({ take: 1000 }); // Exceeds max

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500, // Should be capped at 500
        }),
      );
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask password fields', () => {
      const data = {
        email: 'user@example.com',
        password: 'SecurePassword123',
      };

      const masked = service.maskSensitiveData({ body: data });

      expect(masked.body.email).toBe('user@example.com');
      expect(masked.body.password).toBe('***REDACTED***');
    });

    it('should mask JWT tokens', () => {
      const data = {
        accessToken: 'eyJhbGc...',
        refreshToken: 'eyJhbGc...',
      };

      const masked = service.maskSensitiveData({ body: data });

      expect(masked.body.accessToken).toBe('***REDACTED***');
      expect(masked.body.refreshToken).toBe('***REDACTED***');
    });

    it('should mask Authorization header', () => {
      const headers = {
        'Authorization': 'Bearer eyJhbGc...',
        'Content-Type': 'application/json',
      };

      const masked = service.maskSensitiveData({ headers });

      expect(masked.headers.Authorization).toBe('***REDACTED***');
      expect(masked.headers['Content-Type']).toBe('application/json');
    });

    it('should recursively mask nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          password: 'SecurePassword123',
          settings: {
            apiKey: 'sk_test_123456',
          },
        },
      };

      const masked = service.maskSensitiveData({ body: data });

      expect(masked.body.user.email).toBe('user@example.com');
      expect(masked.body.user.password).toBe('***REDACTED***');
      expect(masked.body.user.settings.apiKey).toBe('***REDACTED***');
    });
  });

  describe('getPatientAuditLogs', () => {
    it('should get audit logs for patient', async () => {
      const logs = [
        {
          id: 'log_1',
          action: 'patient_login',
          resourceType: 'patient',
          resourceId: 'pat_1',
          patientId: 'pat_1',
          status: 'success',
          createdAt: new Date(),
        },
      ];

      prismaService.auditLog.findMany.mockResolvedValue(logs as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.getPatientAuditLogs('pat_1');

      expect(result.total).toBe(1);
      expect(result.logs.length).toBe(1);
    });
  });

  describe('getHospitalAuditLogs', () => {
    it('should get audit logs for hospital', async () => {
      const logs = [
        {
          id: 'log_1',
          action: 'hospital_register',
          resourceType: 'hospital',
          resourceId: 'hosp_1',
          hospitalId: 'hosp_1',
          status: 'success',
          createdAt: new Date(),
        },
      ];

      prismaService.auditLog.findMany.mockResolvedValue(logs as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.getHospitalAuditLogs('hosp_1');

      expect(result.total).toBe(1);
      expect(result.logs.length).toBe(1);
    });
  });

  describe('getAuditSummary', () => {
    it('should return audit summary', async () => {
      const logs: any[] = [];
      prismaService.auditLog.count.mockResolvedValue(10);
      prismaService.auditLog.count.mockResolvedValueOnce(10);
      prismaService.auditLog.count.mockResolvedValueOnce(8);
      prismaService.auditLog.count.mockResolvedValueOnce(2);
      prismaService.auditLog.groupBy.mockResolvedValue([
        { action: 'patient_login', _count: { id: 5 } },
        { action: 'hospital_register', _count: { id: 3 } },
      ]);

      const result = await service.getAuditSummary(7);

      expect(result.totalLogs).toBeDefined();
      expect(result.successCount).toBeDefined();
      expect(result.failedCount).toBeDefined();
      expect(result.byAction).toBeDefined();
      expect(result.period).toBeDefined();
    });
  });

  describe('formatAction', () => {
    it('should format action from method and path', () => {
      const action = service.formatAction('POST', '/api/patients/signup');
      expect(action).toBe('patients_signup');
    });

    it('should handle different paths', () => {
      const action = service.formatAction('GET', '/api/consent/requests/pending');
      expect(action).toContain('consent');
    });
  });

  describe('formatResourceType', () => {
    it('should format resource type from path', () => {
      const type = service.formatResourceType('/api/patients/123');
      expect(type).toBe('patients');
    });

    it('should return unknown for empty path', () => {
      const type = service.formatResourceType('/');
      expect(type).toBe('unknown');
    });
  });
});
