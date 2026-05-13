import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { DataRequestService } from '@modules/data-request/data-request.service';
import { DataType } from '@modules/data-request/dto/data-request.dto';
import { ConsentService } from '@modules/consent/consent.service';
import { DefenseGateway } from './defense.gateway';
import { DefenseEvent, DefenseEventType } from './defense.types';

@Injectable()
export class DefenseService {
  private readonly DEFENSE_STEP_DELAY_MS = Math.max(
    0,
    Number(process.env.DEFENSE_DEMO_STEP_DELAY_MS || 1200),
  );

  constructor(
    private readonly defenseGateway: DefenseGateway,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataRequestService))
    private readonly dataRequestService: DataRequestService,
    @Inject(forwardRef(() => ConsentService))
    private readonly consentService: ConsentService,
  ) {}

  emit(type: DefenseEventType, payload: DefenseEvent['payload']) {
    this.defenseGateway.emitEvent({
      type,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  async startDemoFlow(
    token?: string,
    body?: {
      patientId?: string;
      patientRef?: string;
      targetHospitalId?: string;
      purpose?: string;
      dataTypes?: string[];
      autoApprove?: boolean;
      forceConsent?: boolean;
    },
  ) {
    this.assertDemoToken(token);

    const hospitalA = await this.upsertDemoHospital({
      name: 'Hospital A (Demo)',
      code: 'DEFENSE_HOSPITAL_A',
      endpoint: process.env.DEFENSE_HOSPITAL_A_ENDPOINT || 'http://localhost:4001',
      redirectUri: 'http://localhost:4001/oauth/callback',
    });
    const hospitalB = await this.upsertDemoHospital({
      name: 'Hospital B (Demo)',
      code: 'DEFENSE_HOSPITAL_B',
      endpoint: process.env.DEFENSE_HOSPITAL_B_ENDPOINT || 'http://localhost:4002',
      redirectUri: 'http://localhost:4002/oauth/callback',
    });

    const patientRef = body?.patientRef || body?.patientId;
    const patient = await this.resolveDemoPatient(patientRef);
    const selectedTargetHospital = body?.targetHospitalId
      ? await this.prisma.hospital.findUnique({
          where: { id: body.targetHospitalId },
        })
      : null;

    // For defense demo, Hospital A is the data holder (has patient data)
    // Hospital B is the requester
    let targetHospital = selectedTargetHospital && selectedTargetHospital.isActive
      ? selectedTargetHospital
      : null;

    if (!targetHospital) {
      // Default to Hospital A for defense demo
      targetHospital = hospitalA;
    }

    const dataTypes = this.normalizeDataTypes(body?.dataTypes);
    const purpose =
      body?.purpose ||
      'Emergency referral and continuity of care (defense demo)';

    const shouldForceConsent = body?.forceConsent !== false;
    if (shouldForceConsent) {
      await this.prisma.consentRecord.updateMany({
        where: {
          patientId: patient.id,
          requestingHospitalId: hospitalB.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    const initialRequest = await this.dataRequestService.createDataRequest(
      {
        patientId: patient.id,
        sourceHospitalId: hospitalB.id,
        targetHospitalId: targetHospital.id,
        dataTypes,
        purpose,
      },
      hospitalB.id,
    );

    const shouldAutoApprove = body?.autoApprove === true;
    if (shouldAutoApprove) {
      const pendingLink = await this.prisma.dataRequest.findUnique({
        where: { id: initialRequest.id },
        select: { consentRequestId: true, status: true },
      });

      if (pendingLink?.consentRequestId && pendingLink.status === 'pending') {
        await this.delay(this.DEFENSE_STEP_DELAY_MS);
        await this.consentService.approveConsentRequest(pendingLink.consentRequestId, {});
      }
    }

    const request = await this.dataRequestService.getDataRequestById(initialRequest.id);

    return {
      ok: true,
      request,
      context: {
        patientId: patient.id,
        sourceHospitalId: hospitalB.id,
        targetHospitalId: targetHospital.id,
        autoApproved: shouldAutoApprove,
      },
    };
  }

  async approveConsent(
    token?: string,
    body?: {
      dataRequestId?: string;
      consentRequestId?: string;
    },
  ) {
    this.assertDemoToken(token);

    let consentRequestId = String(body?.consentRequestId || '').trim();

    if (!consentRequestId) {
      const dataRequestId = String(body?.dataRequestId || '').trim();
      if (!dataRequestId) {
        throw new UnauthorizedException('dataRequestId or consentRequestId is required');
      }

      const request = await this.prisma.dataRequest.findUnique({
        where: { id: dataRequestId },
        select: {
          id: true,
          consentRequestId: true,
        },
      });

      if (!request?.consentRequestId) {
        throw new UnauthorizedException('No pending consent found for this request');
      }

      consentRequestId = request.consentRequestId;
    }

    await this.consentService.approveConsentRequest(consentRequestId, {});

    const linkedRequests = await this.prisma.dataRequest.findMany({
      where: { consentRequestId },
      select: {
        id: true,
        patientId: true,
        sourceHospitalId: true,
        targetHospitalId: true,
        dataTypes: true,
      },
      take: 20,
    });

    linkedRequests.forEach((request) => {
      this.emit('consent_approved', {
        dataRequestId: request.id,
        consentRequestId,
        patientId: request.patientId,
        sourceHospitalId: request.sourceHospitalId,
        targetHospitalId: request.targetHospitalId,
        dataTypes: request.dataTypes,
        status: 'approved',
      });
    });

    return {
      ok: true,
      consentRequestId,
    };
  }

  async listPatients(token?: string) {
    this.assertDemoToken(token);

    const patients = await this.prisma.patient.findMany({
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return {
      patients: patients.map((p) => ({
        id: p.id,
        externalId: p.externalId,
        fullName: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
      })),
    };
  }

  async resolvePatient(token?: string, patientRef?: string) {
    this.assertDemoToken(token);

    const patient = await this.findPatientByRef(patientRef);
    if (!patient) {
      return {
        found: false,
        patient: null,
        hospitals: [],
      };
    }

    const profile = await this.resolvePatientProfile(patient.id);
    return {
      found: true,
      patient: {
        id: patient.id,
        externalId: patient.externalId,
        fullName: `${patient.firstName} ${patient.lastName}`.trim(),
        email: patient.email,
      },
      hospitals: profile.hospitals,
    };
  }

  private assertDemoToken(token?: string) {
    const expected = process.env.DEFENSE_DEMO_TOKEN || 'carebridge-defense-demo';
    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid defense demo token');
    }
  }

  private normalizeDataTypes(input?: string[]): DataType[] {
    const allowed = new Set<string>(Object.values(DataType));
    const normalized = (input || [])
      .map((type) => String(type || '').trim().toLowerCase())
      .filter((type) => allowed.has(type));

    return (normalized.length ? normalized : [DataType.BLOOD_TESTS, DataType.BLOOD_GROUP, DataType.HEALTH_HISTORY]) as DataType[];
  }

  private async findPatientByRef(patientRef?: string) {
    const ref = String(patientRef || '').trim();
    if (!ref) return null;

    const byId = await this.prisma.patient.findUnique({ where: { id: ref } });
    if (byId) return byId;

    const byExternalId = await this.prisma.patient.findUnique({
      where: { externalId: ref },
    });
    if (byExternalId) return byExternalId;

    const byEmail = await this.prisma.patient.findUnique({
      where: { email: ref.toLowerCase() },
    });
    if (byEmail) return byEmail;

    const uidPattern = /^[A-Z]{2}-\d{5}-\d{4}$/;
    if (uidPattern.test(ref.toUpperCase())) {
      const uidRef = ref.toUpperCase();
      const candidates = await this.prisma.patient.findMany({
        take: 300,
        orderBy: { createdAt: 'asc' },
      });

      const matchedByUid = candidates.find(
        (patient) => this.toPatientUid(patient.firstName, patient.lastName, patient.externalId) === uidRef,
      );
      if (matchedByUid) return matchedByUid;
    }

    return this.prisma.patient.findFirst({
      where: {
        OR: [
          { firstName: { contains: ref, mode: 'insensitive' } },
          { lastName: { contains: ref, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private toPatientUid(firstName: string, lastName: string, externalId: string) {
    const namePrefix = `${String(firstName || '')}${String(lastName || '')}`
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
  }

  private async resolvePatientProfile(patientId: string) {
    const [historicalDataRequests, consentRecords, demoHospital] = await Promise.all([
      this.prisma.dataRequest.findMany({
        where: {
          patientId,
          status: 'completed',
        },
        select: {
          sourceHospitalId: true,
          targetHospitalId: true,
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.consentRecord.findMany({
        where: { patientId },
        select: {
          sourceHospitalId: true,
          requestingHospitalId: true,
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hospital.findUnique({
        where: { code: 'DEFENSE_HOSPITAL_A' },
        select: { id: true },
      }),
    ]);

    const hospitalIds = new Set<string>();
    historicalDataRequests.forEach((request) => {
      if (request.targetHospitalId) hospitalIds.add(request.targetHospitalId);
      if (request.sourceHospitalId) hospitalIds.add(request.sourceHospitalId);
    });
    consentRecords.forEach((record) => {
      if (record.sourceHospitalId) hospitalIds.add(record.sourceHospitalId);
      if (record.requestingHospitalId) hospitalIds.add(record.requestingHospitalId);
    });
    if (demoHospital?.id) hospitalIds.add(demoHospital.id);

    const hospitals = hospitalIds.size
      ? await this.prisma.hospital.findMany({
          where: { id: { in: Array.from(hospitalIds) }, isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            endpoint: true,
          },
          orderBy: { name: 'asc' },
        })
      : [];

    return {
      hospitals: hospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        endpoint: hospital.endpoint,
      })),
    };
  }

  private async resolveDemoPatient(patientRef?: string) {
    let matchedByRef = await this.findPatientByRef(patientRef);
    if (matchedByRef) {
      // Update externalId if patientRef is provided and differs from stored externalId
      if (patientRef && patientRef !== matchedByRef.externalId) {
        matchedByRef = await this.prisma.patient.update({
          where: { id: matchedByRef.id },
          data: { externalId: patientRef },
        });
      }
      return matchedByRef;
    }

    const danielSamuel = await this.prisma.patient.findFirst({
      where: {
        firstName: { equals: 'Daniel', mode: 'insensitive' },
        lastName: { equals: 'Samuel', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (danielSamuel) {
      // Update externalId if patientRef is provided and differs
      if (patientRef && patientRef !== danielSamuel.externalId) {
        return this.prisma.patient.update({
          where: { id: danielSamuel.id },
          data: { externalId: patientRef },
        });
      }
      return danielSamuel;
    }

    const fixedDemo = await this.prisma.patient.findUnique({
      where: { id: 'patient-001' },
    });
    if (fixedDemo) {
      const needsIdentityUpdate =
        fixedDemo.firstName.toLowerCase() !== 'daniel' ||
        fixedDemo.lastName.toLowerCase() !== 'samuel' ||
        fixedDemo.externalId !== 'PAT_DEMO_001' ||
        fixedDemo.email !== 'daniel.samuel@carebridge.local';

      if (!needsIdentityUpdate) return fixedDemo;

      return this.prisma.patient.update({
        where: { id: 'patient-001' },
        data: {
          externalId: 'PAT_DEMO_001',
          email: 'daniel.samuel@carebridge.local',
          firstName: 'Daniel',
          lastName: 'Samuel',
        },
      });
    }

    const passwordHash = await bcrypt.hash('demo-password-123', 10);
    return this.prisma.patient
      .create({
        data: {
          id: 'patient-001',
          externalId: 'PAT_DEMO_001',
          email: 'daniel.samuel@carebridge.local',
          passwordHash,
          firstName: 'Daniel',
          lastName: 'Samuel',
        },
      })
      .catch(async () => {
        const fallback = await this.prisma.patient.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (!fallback) throw new UnauthorizedException('Unable to prepare demo patient');
        return fallback;
      });
  }

  private delay(ms: number) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async upsertDemoHospital(input: {
    name: string;
    code: string;
    endpoint: string;
    redirectUri: string;
  }) {
    const clientSecret = await bcrypt.hash(`${input.code}-secret`, 10);
    return this.prisma.hospital.upsert({
      where: { code: input.code },
      create: {
        name: input.name,
        code: input.code,
        clientId: `${input.code.toLowerCase()}_client_id`,
        clientSecret,
        redirectUri: input.redirectUri,
        endpoint: input.endpoint,
        isActive: true,
      },
      update: {
        name: input.name,
        endpoint: input.endpoint,
        redirectUri: input.redirectUri,
        isActive: true,
      },
    });
  }
}
