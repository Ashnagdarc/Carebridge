import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { DefenseService } from './defense.service';
import { DefenseGateway } from './defense.gateway';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { DataRequestService } from '@modules/data-request/data-request.service';
import { ConsentService } from '@modules/consent/consent.service';

describe('DefenseService', () => {
  let service: DefenseService;
  let prisma: any;
  let gateway: jest.Mocked<DefenseGateway>;
  let dataRequestService: jest.Mocked<DataRequestService>;
  let consentService: jest.Mocked<ConsentService>;

  const patient = {
    id: 'patient-001',
    externalId: 'PAT_DEMO_001',
    firstName: 'Daniel',
    lastName: 'Samuel',
    email: 'daniel.samuel@carebridge.local',
  };

  const hospitalA = {
    id: 'hosp-a',
    name: 'Hospital A (Demo)',
    code: 'DEFENSE_HOSPITAL_A',
    endpoint: 'http://mock-hospital-a:4001',
    isActive: true,
  };

  const hospitalB = {
    id: 'hosp-b',
    name: 'Hospital B (Demo)',
    code: 'DEFENSE_HOSPITAL_B',
    endpoint: 'http://mock-hospital-b:4002',
    isActive: true,
  };

  const toPatientUid = (firstName: string, lastName: string, externalId: string) => {
    const namePrefix = `${firstName}${lastName}`
      .replace(/\s+/g, '')
      .slice(0, 2)
      .toUpperCase()
      .padEnd(2, 'X');
    const digitsOnly = String(externalId || '').replace(/\D/g, '');
    const idPart = digitsOnly.slice(-5).padStart(5, '0');
    const hashInput = `${namePrefix}:${String(externalId || '').toLowerCase()}`;
    const hashValue = Array.from(hashInput).reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) % 10000;
    }, 0);
    const suffix = String(hashValue)
      .padStart(4, '0')
      .slice(-4);

    return `${namePrefix}-${idPart}-${suffix}`;
  };

  beforeEach(async () => {
    process.env.DEFENSE_DEMO_STEP_DELAY_MS = '0';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefenseService,
        {
          provide: DefenseGateway,
          useValue: {
            emitEvent: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            patient: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            hospital: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            dataRequest: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            consentRecord: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: DataRequestService,
          useValue: {
            createDataRequest: jest.fn(),
            getDataRequestById: jest.fn(),
          },
        },
        {
          provide: ConsentService,
          useValue: {
            approveConsentRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DefenseService>(DefenseService);
    prisma = module.get(PrismaService) as any;
    gateway = module.get(DefenseGateway) as jest.Mocked<DefenseGateway>;
    dataRequestService = module.get(DataRequestService) as jest.Mocked<DataRequestService>;
    consentService = module.get(ConsentService) as jest.Mocked<ConsentService>;

    prisma.hospital.upsert
      .mockResolvedValueOnce(hospitalA)
      .mockResolvedValueOnce(hospitalB);

    prisma.hospital.findUnique.mockImplementation(({ where }: any) => {
      if (where?.code === 'DEFENSE_HOSPITAL_A') {
        return Promise.resolve({ id: hospitalA.id });
      }
      if (where?.id === hospitalA.id) {
        return Promise.resolve(hospitalA);
      }
      if (where?.id === hospitalB.id) {
        return Promise.resolve(hospitalB);
      }
      return Promise.resolve(null);
    });

    prisma.hospital.findMany.mockResolvedValue([hospitalA, hospitalB]);

    prisma.patient.findUnique.mockImplementation(({ where }: any) => {
      if (where?.id === 'patient-001') return Promise.resolve(patient);
      if (where?.externalId === 'PAT_DEMO_001') return Promise.resolve(patient);
      if (where?.email === 'daniel.samuel@carebridge.local') return Promise.resolve(patient);
      return Promise.resolve(null);
    });

    prisma.patient.findFirst.mockResolvedValue(null);
    prisma.dataRequest.findMany.mockResolvedValue([
      { sourceHospitalId: hospitalA.id, targetHospitalId: hospitalB.id },
    ]);
    prisma.consentRecord.findMany.mockResolvedValue([
      { sourceHospitalId: hospitalA.id, requestingHospitalId: hospitalB.id },
    ]);
    prisma.consentRecord.updateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits events through gateway', () => {
    service.emit('data_request_created', { dataRequestId: 'dr-1' });

    expect(gateway.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'data_request_created',
        payload: { dataRequestId: 'dr-1' },
      }),
    );
  });

  it('rejects invalid defense token', async () => {
    await expect(service.listPatients('wrong-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns not found when patient cannot be resolved', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    prisma.patient.findFirst.mockResolvedValue(null);

    const result = await service.resolvePatient(
      'carebridge-defense-demo',
      'unknown-ref',
    );

    expect(result).toEqual({ found: false, patient: null, hospitals: [] });
  });

  it('resolves patient profile from reference', async () => {
    const result = await service.resolvePatient(
      'carebridge-defense-demo',
      'PAT_DEMO_001',
    );

    expect(result.found).toBe(true);
    expect(result.patient).toEqual(
      expect.objectContaining({
        id: 'patient-001',
        externalId: 'PAT_DEMO_001',
        fullName: 'Daniel Samuel',
      }),
    );
    expect(result.hospitals).toHaveLength(2);
  });

  it('resolves patient profile from UID/QR value', async () => {
    const uidRef = toPatientUid(patient.firstName, patient.lastName, patient.externalId);

    prisma.patient.findUnique.mockImplementation(({ where }: any) => {
      if (where?.id === uidRef) return Promise.resolve(null);
      if (where?.externalId === uidRef) return Promise.resolve(null);
      if (where?.email === uidRef.toLowerCase()) return Promise.resolve(null);
      if (where?.id === 'patient-001') return Promise.resolve(patient);
      if (where?.externalId === 'PAT_DEMO_001') return Promise.resolve(patient);
      if (where?.email === 'daniel.samuel@carebridge.local') return Promise.resolve(patient);
      return Promise.resolve(null);
    });
    prisma.patient.findMany.mockResolvedValue([patient]);

    const result = await service.resolvePatient('carebridge-defense-demo', uidRef);

    expect(result.found).toBe(true);
    expect(result.patient).toEqual(
      expect.objectContaining({
        id: 'patient-001',
        externalId: 'PAT_DEMO_001',
      }),
    );
  });

  it('starts demo flow and auto-approves pending consent when enabled', async () => {
    dataRequestService.createDataRequest.mockResolvedValue({
      id: 'dr-1',
    } as any);
    prisma.dataRequest.findUnique.mockResolvedValue({
      consentRequestId: 'cr-1',
      status: 'pending',
    });
    dataRequestService.getDataRequestById.mockResolvedValue({
      id: 'dr-1',
      status: 'completed',
    } as any);

    const result = await service.startDemoFlow('carebridge-defense-demo', {
      patientRef: 'PAT_DEMO_001',
      autoApprove: true,
      forceConsent: true,
    });

    expect(dataRequestService.createDataRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-001',
        sourceHospitalId: hospitalB.id,
      }),
      hospitalB.id,
    );
    expect(consentService.approveConsentRequest).toHaveBeenCalledWith('cr-1', {});
    expect(result.ok).toBe(true);
    expect(result.request).toEqual(expect.objectContaining({ id: 'dr-1' }));
  });

  it('approves consent from linked data request id and emits approval event', async () => {
    prisma.dataRequest.findUnique.mockResolvedValue({
      id: 'dr-2',
      consentRequestId: 'cr-2',
    });
    prisma.dataRequest.findMany.mockResolvedValue([
      {
        id: 'dr-2',
        patientId: 'patient-001',
        sourceHospitalId: hospitalB.id,
        targetHospitalId: hospitalA.id,
        dataTypes: ['blood_tests', 'blood_group', 'health_history'],
      },
    ]);

    const result = await service.approveConsent('carebridge-defense-demo', {
      dataRequestId: 'dr-2',
    });

    expect(consentService.approveConsentRequest).toHaveBeenCalledWith('cr-2', {});
    expect(gateway.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'consent_approved',
        payload: expect.objectContaining({
          consentRequestId: 'cr-2',
          dataRequestId: 'dr-2',
        }),
      }),
    );
    expect(result).toEqual({ ok: true, consentRequestId: 'cr-2' });
  });

  it('updates fixed demo identity to Daniel Samuel when stale', async () => {
    const staleDemo = {
      id: 'patient-001',
      externalId: 'PAT_001',
      firstName: 'Defense',
      lastName: 'Patient',
      email: 'defense.demo.patient@carebridge.local',
    };

    prisma.patient.findUnique.mockImplementation(({ where }: any) => {
      if (where?.id === 'PAT_DEMO_001') return Promise.resolve(null);
      if (where?.externalId === 'PAT_DEMO_001') return Promise.resolve(null);
      if (where?.email === 'pat_demo_001') return Promise.resolve(null);
      if (where?.id === 'patient-001') return Promise.resolve(staleDemo);
      return Promise.resolve(null);
    });

    prisma.patient.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.patient.update.mockResolvedValue({ ...patient });

    dataRequestService.createDataRequest.mockResolvedValue({ id: 'dr-3' } as any);
    dataRequestService.getDataRequestById.mockResolvedValue({ id: 'dr-3' } as any);

    await service.startDemoFlow('carebridge-defense-demo', {
      patientRef: 'PAT_DEMO_001',
      autoApprove: false,
    });

    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'patient-001' },
      data: {
        externalId: 'PAT_DEMO_001',
        email: 'daniel.samuel@carebridge.local',
        firstName: 'Daniel',
        lastName: 'Samuel',
      },
    });
  });
});
