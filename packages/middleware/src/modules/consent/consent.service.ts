import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@src/common/prisma/prisma.service';
import {
  CreateConsentRequestDto,
  ApproveConsentRequestDto,
  DenyConsentRequestDto,
  RevokeConsentDto,
  ConsentRequestResponseDto,
  ConsentRecordResponseDto,
} from './dto/consent.dto';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Hospital initiates a consent request from a patient
   */
  async createConsentRequest(
    dto: CreateConsentRequestDto,
  ): Promise<ConsentRequestResponseDto> {
    // Validate input
    if (!dto.patientId || !dto.requestingHospitalId || !dto.dataType) {
      throw new BadRequestException(
        'patientId, requestingHospitalId, and dataType are required',
      );
    }

    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new BadRequestException(`Patient with ID "${dto.patientId}" not found`);
    }

    // Verify requesting hospital exists
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.requestingHospitalId },
    });

    if (!hospital || !hospital.isActive) {
      throw new BadRequestException(
        `Hospital with ID "${dto.requestingHospitalId}" not found or inactive`,
      );
    }

    // Generate approval code for patient verification
    const approvalCode = this.generateApprovalCode();

    // Calculate expiry date (default 30 days from now)
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create consent request
    const consentRequest = await this.prisma.consentRequest.create({
      data: {
        patientId: dto.patientId,
        requestingHospitalId: dto.requestingHospitalId,
        dataType: dto.dataType,
        description: dto.description || null,
        status: 'pending',
        expiresAt,
        approvalCode,
      },
      include: {
        requestingHospital: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return this.mapConsentRequestToResponse(consentRequest);
  }

  /**
   * Patient approves a consent request
   */
  async approveConsentRequest(
    consentRequestId: string,
    dto: ApproveConsentRequestDto,
  ): Promise<ConsentRequestResponseDto> {
    // Find consent request
    const consentRequest = await this.prisma.consentRequest.findUnique({
      where: { id: consentRequestId },
      include: {
        requestingHospital: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!consentRequest) {
      throw new NotFoundException(
        `Consent request with ID "${consentRequestId}" not found`,
      );
    }

    // Verify status is pending
    if (consentRequest.status !== 'pending') {
      throw new BadRequestException(
        `Consent request has already been ${consentRequest.status}`,
      );
    }

    // Verify approval code if the caller is using the out-of-band approval path.
    if (dto.approvalCode && consentRequest.approvalCode !== dto.approvalCode) {
      throw new UnauthorizedException('Invalid approval code');
    }

    // Verify not expired
    if (consentRequest.expiresAt && new Date() > consentRequest.expiresAt) {
      throw new BadRequestException('Consent request has expired');
    }

    const consentExpiresAt = dto.expiryDays
      ? new Date(Date.now() + dto.expiryDays * 24 * 60 * 60 * 1000)
      : consentRequest.expiresAt;

    // Update consent request status
    const updated = await this.prisma.consentRequest.update({
      where: { id: consentRequestId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
      include: {
        requestingHospital: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Create consent record to track this approval
    await this.prisma.consentRecord.create({
      data: {
        consentRequestId,
        patientId: consentRequest.patientId,
        requestingHospitalId: consentRequest.requestingHospitalId,
        sourceHospitalId: consentRequest.requestingHospitalId, // For now, same as requesting hospital
        dataType: consentRequest.dataType,
        expiresAt: consentExpiresAt,
      },
    });

    return this.mapConsentRequestToResponse(updated);
  }

  /**
   * Patient denies a consent request
   */
  async denyConsentRequest(
    consentRequestId: string,
    dto?: DenyConsentRequestDto,
  ): Promise<ConsentRequestResponseDto> {
    // Find consent request
    const consentRequest = await this.prisma.consentRequest.findUnique({
      where: { id: consentRequestId },
      include: {
        requestingHospital: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!consentRequest) {
      throw new NotFoundException(
        `Consent request with ID "${consentRequestId}" not found`,
      );
    }

    // Verify status is pending
    if (consentRequest.status !== 'pending') {
      throw new BadRequestException(
        `Consent request has already been ${consentRequest.status}`,
      );
    }

    // Update consent request status
    const updated = await this.prisma.consentRequest.update({
      where: { id: consentRequestId },
      data: {
        status: 'denied',
        rejectedAt: new Date(),
      },
      include: {
        requestingHospital: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return this.mapConsentRequestToResponse(updated);
  }

  /**
   * Revoke an active consent record
   */
  async revokeConsent(
    consentRecordId: string,
    patientId: string,
    dto?: RevokeConsentDto,
  ): Promise<ConsentRecordResponseDto> {
    // Find consent record
    const consentRecord = await this.prisma.consentRecord.findUnique({
      where: { id: consentRecordId },
    });

    if (!consentRecord) {
      throw new NotFoundException(
        `Consent record with ID "${consentRecordId}" not found`,
      );
    }

    // Verify ownership (patient can only revoke their own consents)
    if (consentRecord.patientId !== patientId) {
      throw new UnauthorizedException(
        'You do not have permission to revoke this consent',
      );
    }

    // Verify not already revoked
    if (consentRecord.revokedAt) {
      throw new BadRequestException('Consent has already been revoked');
    }

    // Revoke consent
    const updated = await this.prisma.consentRecord.update({
      where: { id: consentRecordId },
      data: {
        revokedAt: new Date(),
      },
    });

    return this.mapConsentRecordToResponse(updated);
  }

  /**
   * Get all pending consent requests for a patient
   */
  async listPendingConsentRequests(patientId: string) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new BadRequestException(`Patient with ID "${patientId}" not found`);
    }

    const requests = await this.prisma.consentRequest.findMany({
      where: {
        patientId,
        status: 'pending',
      },
      include: {
        requestingHospital: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      requests: requests.map(this.mapConsentRequestToResponse),
      total: requests.length,
    };
  }

  /**
   * Get all active consents for a patient
   */
  async listActiveConsents(patientId: string) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new BadRequestException(`Patient with ID "${patientId}" not found`);
    }

    const consents = await this.prisma.consentRecord.findMany({
      where: {
        patientId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(), // Only return non-expired consents
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      consents: consents.map(this.mapConsentRecordToResponse),
      total: consents.length,
    };
  }

  /**
   * Hospital gets all consent records for a specific patient (if approved)
   */
  async getConsentRecordsForHospital(patientId: string, hospitalId: string) {
    // Verify hospital exists
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new BadRequestException(`Hospital with ID "${hospitalId}" not found`);
    }

    const consents = await this.prisma.consentRecord.findMany({
      where: {
        patientId,
        requestingHospitalId: hospitalId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return consents;
  }

  /**
   * Track data access for audit logging
   */
  async recordConsentAccess(
    consentRecordId: string,
    hospitalId: string,
  ): Promise<ConsentRecordResponseDto> {
    const consentRecord = await this.prisma.consentRecord.findUnique({
      where: { id: consentRecordId },
    });

    if (!consentRecord) {
      throw new NotFoundException(
        `Consent record with ID "${consentRecordId}" not found`,
      );
    }

    // Verify the hospital accessing is the requesting hospital
    if (consentRecord.requestingHospitalId !== hospitalId) {
      throw new UnauthorizedException(
        'Hospital is not authorized for this consent',
      );
    }

    // Verify consent is not revoked
    if (consentRecord.revokedAt) {
      throw new BadRequestException('Consent has been revoked');
    }

    // Verify consent is not expired
    if (consentRecord.expiresAt && new Date() > consentRecord.expiresAt) {
      throw new BadRequestException('Consent has expired');
    }

    // Update access tracking
    const updated = await this.prisma.consentRecord.update({
      where: { id: consentRecordId },
      data: {
        accessCount: consentRecord.accessCount + 1,
        lastAccessedAt: new Date(),
      },
    });

    return this.mapConsentRecordToResponse(updated);
  }

  /**
   * Check if a hospital has valid consent to access a patient's data
   */
  async hasActiveConsent(
    patientId: string,
    hospitalId: string,
    dataType: string,
  ): Promise<boolean> {
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        patientId,
        requestingHospitalId: hospitalId,
        dataType,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!consent;
  }

  /**
   * Get expired consents and mark them as expired
   */
  async expireOldConsents(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.consentRequest.updateMany({
      where: {
        status: 'pending',
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }

  // ============ Private Helper Methods ============

  private generateApprovalCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private mapConsentRequestToResponse(consentRequest: any): ConsentRequestResponseDto {
    return {
      id: consentRequest.id,
      patientId: consentRequest.patientId,
      requestingHospitalId: consentRequest.requestingHospitalId,
      dataType: consentRequest.dataType,
      description: consentRequest.description,
      status: consentRequest.status,
      expiresAt: consentRequest.expiresAt,
      createdAt: consentRequest.createdAt,
      requestingHospital: consentRequest.requestingHospital,
    };
  }

  private mapConsentRecordToResponse(consentRecord: any): ConsentRecordResponseDto {
    return {
      id: consentRecord.id,
      consentRequestId: consentRecord.consentRequestId,
      patientId: consentRecord.patientId,
      requestingHospitalId: consentRecord.requestingHospitalId,
      sourceHospitalId: consentRecord.sourceHospitalId,
      dataType: consentRecord.dataType,
      accessCount: consentRecord.accessCount,
      lastAccessedAt: consentRecord.lastAccessedAt,
      revokedAt: consentRecord.revokedAt,
      expiresAt: consentRecord.expiresAt,
      createdAt: consentRecord.createdAt,
    };
  }
}
