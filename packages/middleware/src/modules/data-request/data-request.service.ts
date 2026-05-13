import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry } from 'rxjs';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { AuditService } from '../audit/audit.service';
import { DefenseService } from '../defense/defense.service';
import {
  CreateDataRequestDto,
  DataRequestResponseDto,
  ListDataRequestsQueryDto,
  ListDataRequestsResponseDto,
  DataRequestStatus,
  DataType,
} from './dto/data-request.dto';

@Injectable()
export class DataRequestService {
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds
  private readonly DEFENSE_STEP_DELAY_MS = Math.max(
    0,
    Number(process.env.DEFENSE_DEMO_STEP_DELAY_MS || 1200),
  );
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly HOSPITAL_API_TOKEN =
    process.env.HOSPITAL_API_TOKEN ||
    process.env.MOCK_HOSPITAL_TOKEN ||
    'mock-hospital-token';

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ConsentService))
    private consentService: ConsentService,
    private auditService: AuditService,
    private httpService: HttpService,
    @Inject(forwardRef(() => DefenseService))
    private defenseService: DefenseService,
  ) {}

  async resumePendingRequestsForConsent(consentRequestId: string) {
    if (!consentRequestId) return { resumed: 0 };

    const pending = await this.prisma.dataRequest.findMany({
      where: {
        consentRequestId,
        status: DataRequestStatus.PENDING,
      },
      select: { id: true },
    });

    for (const req of pending) {
      await this.resumeDataRequest(req.id);
    }

    return { resumed: pending.length };
  }

  async failPendingRequestsForConsent(
    consentRequestId: string,
    reason = 'Consent request denied by patient',
  ) {
    if (!consentRequestId) return { failed: 0 };

    const pending = await this.prisma.dataRequest.findMany({
      where: {
        consentRequestId,
        status: DataRequestStatus.PENDING,
      },
      select: {
        id: true,
        patientId: true,
        sourceHospitalId: true,
      },
    });

    if (pending.length === 0) {
      return { failed: 0 };
    }

    await this.prisma.dataRequest.updateMany({
      where: {
        consentRequestId,
        status: DataRequestStatus.PENDING,
      },
      data: {
        status: DataRequestStatus.FAILED,
        failureReason: reason,
        completedAt: new Date(),
      },
    });

    await Promise.all(
      pending.map((request) =>
        this.auditService.createAuditLog({
          action: 'data_request_failed',
          resourceType: 'data_request',
          resourceId: request.id,
          patientId: request.patientId,
          hospitalId: request.sourceHospitalId,
          status: 'failed',
          details: JSON.stringify({
            reason,
            phase: 'consent_denied',
            consentRequestId,
          }),
        }),
      ),
    );

    pending.forEach((request) => {
      this.defenseService.emit('data_request_failed', {
        dataRequestId: request.id,
        patientId: request.patientId,
        sourceHospitalId: request.sourceHospitalId,
        status: DataRequestStatus.FAILED,
        failureReason: reason,
      });
    });

    return { failed: pending.length };
  }

  async resumeDataRequest(dataRequestId: string): Promise<DataRequestResponseDto> {
    const dataRequest = await this.prisma.dataRequest.findUnique({
      where: { id: dataRequestId },
    });

    if (!dataRequest) {
      throw new BadRequestException(`Data request "${dataRequestId}" not found`);
    }

    if (dataRequest.status !== DataRequestStatus.PENDING) {
      return this.mapDataRequestToResponse(dataRequest);
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dataRequest.patientId },
    });
    if (!patient) {
      throw new BadRequestException(`Patient "${dataRequest.patientId}" not found`);
    }

    const [sourceHospital, targetHospital] = await Promise.all([
      this.prisma.hospital.findUnique({ where: { id: dataRequest.sourceHospitalId } }),
      this.prisma.hospital.findUnique({ where: { id: dataRequest.targetHospitalId } }),
    ]);

    if (!sourceHospital) {
      throw new BadRequestException(`Source hospital "${dataRequest.sourceHospitalId}" not found`);
    }
    if (!targetHospital) {
      throw new BadRequestException(`Target hospital "${dataRequest.targetHospitalId}" not found`);
    }

    const consentRecordId =
      dataRequest.consentRecordId ||
      (dataRequest.consentRequestId
        ? (
            await this.prisma.consentRecord.findFirst({
              where: {
                consentRequestId: dataRequest.consentRequestId,
                revokedAt: null,
              },
              select: { id: true },
            })
          )?.id
        : undefined);

    return this.routeDataRequest(
      dataRequest,
      sourceHospital,
      targetHospital,
      patient,
      consentRecordId ?? 'consent_from_check',
      Date.now(),
    );
  }

  /**
   * Create a data request between hospitals
   * Validates consent, creates request, and routes to target hospital
   */
  async createDataRequest(
    dto: CreateDataRequestDto,
    sourceHospitalId: string, // From authenticated hospital token
  ): Promise<DataRequestResponseDto> {
    // Validate request
    if (!dto.patientId || !dto.targetHospitalId || !dto.dataTypes?.length) {
      throw new BadRequestException(
        'patientId, targetHospitalId, and dataTypes are required',
      );
    }

    // Verify sourceHospitalId matches authenticated hospital
    if (dto.sourceHospitalId !== sourceHospitalId) {
      throw new UnauthorizedException(
        'Hospital cannot request data on behalf of another hospital',
      );
    }

    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new BadRequestException(`Patient "${dto.patientId}" not found`);
    }

    // Verify target hospital exists
    const targetHospital = await this.prisma.hospital.findUnique({
      where: { id: dto.targetHospitalId },
    });

    if (!targetHospital) {
      throw new BadRequestException(
        `Target hospital "${dto.targetHospitalId}" not found`,
      );
    }

    // Verify source hospital exists
    const sourceHospital = await this.prisma.hospital.findUnique({
      where: { id: sourceHospitalId },
    });

    if (!sourceHospital) {
      throw new BadRequestException(`Source hospital not found`);
    }

    // Create data request record in PENDING status
    const startTime = Date.now();
    let consentId: string | null = null;

    const dataRequest = await this.prisma.dataRequest.create({
      data: {
        patientId: dto.patientId,
        sourceHospitalId,
        targetHospitalId: dto.targetHospitalId,
        dataTypes: dto.dataTypes,
        purpose: dto.purpose,
        notes: dto.notes,
        status: DataRequestStatus.PENDING,
        requestedAt: new Date(),
      },
    });

    this.defenseService.emit('data_request_created', {
      dataRequestId: dataRequest.id,
      patientId: dataRequest.patientId,
      sourceHospitalId,
      targetHospitalId: dto.targetHospitalId,
      dataTypes: dto.dataTypes,
      purpose: dto.purpose || null,
      status: DataRequestStatus.PENDING,
    });

    try {
      // Check if patient has active consent for source hospital
      // For data requests, all requested dataTypes must be consented
      const consentChecks = await Promise.all(
        dto.dataTypes.map((dataType) =>
          this.consentService.hasActiveConsent(
            dto.patientId,
            sourceHospitalId,
            dataType,
          ),
        ),
      );
      const hasConsent = consentChecks.every(Boolean);

      if (!hasConsent) {
        // Create consent request if not already consented
        const consentRequest = await this.consentService.createConsentRequest({
          patientId: dto.patientId,
          requestingHospitalId: sourceHospitalId,
          dataType: dto.dataTypes.join(', '),
          description: dto.purpose || `Data request: ${dto.dataTypes.join(', ')}`,
        });

        // Update data request with pending consent
        await this.prisma.dataRequest.update({
          where: { id: dataRequest.id },
          data: {
            status: DataRequestStatus.PENDING,
            consentRequestId: consentRequest.id,
            failureReason:
              'Awaiting patient consent. Consent request initiated.',
          },
        });

        // Audit log
        await this.auditService.createAuditLog({
          action: 'data_request_created_pending_consent',
          resourceType: 'data_request',
          resourceId: dataRequest.id,
          patientId: dto.patientId,
          hospitalId: sourceHospitalId,
          status: 'success',
          details: JSON.stringify({
            reason: 'No active consent',
            consentRequestId: consentRequest.id,
          }),
        });

        this.defenseService.emit('consent_request_created', {
          dataRequestId: dataRequest.id,
          consentRequestId: consentRequest.id,
          patientId: dto.patientId,
          sourceHospitalId,
          targetHospitalId: dto.targetHospitalId,
          dataTypes: dto.dataTypes,
          status: DataRequestStatus.PENDING,
        });

        return this.mapDataRequestToResponse(dataRequest);
      }

      consentId = 'consent_from_check'; // Mark that consent was verified

      // Consent exists - route request to target hospital
      return await this.routeDataRequest(
        dataRequest,
        sourceHospital,
        targetHospital,
        patient,
        consentId,
        startTime,
      );
    } catch (error) {
      // On error, mark request as failed
      const latencyMs = Date.now() - startTime;

      await this.prisma.dataRequest.update({
        where: { id: dataRequest.id },
        data: {
          status: DataRequestStatus.FAILED,
          failureReason: error.message,
          completedAt: new Date(),
          latencyMs,
        },
      });

      // Audit log
      await this.auditService.createAuditLog({
        action: 'data_request_failed',
        resourceType: 'data_request',
        resourceId: dataRequest.id,
        patientId: dto.patientId,
        hospitalId: sourceHospitalId,
        status: 'failed',
        details: JSON.stringify({
          error: error.message,
          latencyMs,
        }),
      });

      throw error;
    }
  }

  /**
   * Route data request to target hospital
   */
  private async routeDataRequest(
    dataRequest: any,
    sourceHospital: any,
    targetHospital: any,
    patient: any,
    consentId: string | null,
    startTime: number,
  ): Promise<DataRequestResponseDto> {
    const latencyStart = Date.now();

    try {
      // Update status to IN_PROGRESS
      await this.prisma.dataRequest.update({
        where: { id: dataRequest.id },
        data: { status: DataRequestStatus.IN_PROGRESS },
      });

      this.defenseService.emit('data_request_in_progress', {
        dataRequestId: dataRequest.id,
        patientId: patient.id,
        sourceHospitalId: sourceHospital.id,
        targetHospitalId: targetHospital.id,
        dataTypes: dataRequest.dataTypes,
        status: DataRequestStatus.IN_PROGRESS,
      });

      const isDefenseDemo = this.isDefenseDemoRequest(dataRequest);
      if (isDefenseDemo) {
        this.defenseService.emit('data_fetch_started', {
          dataRequestId: dataRequest.id,
          patientId: patient.id,
          sourceHospitalId: sourceHospital.id,
          targetHospitalId: targetHospital.id,
          dataTypes: dataRequest.dataTypes,
          status: DataRequestStatus.IN_PROGRESS,
        });
        await this.delay(this.DEFENSE_STEP_DELAY_MS);
      }

      // Fetch data from the hospital holding the records, then deliver it to
      // the requesting hospital. The existing DTO uses sourceHospitalId for
      // the requester and targetHospitalId for the data holder.
      const responseData = await this.fetchDataFromHospital(
        targetHospital,
        patient.externalId || patient.id,
        dataRequest.dataTypes,
      );
      if (isDefenseDemo) {
        this.defenseService.emit('data_delivery_started', {
          dataRequestId: dataRequest.id,
          patientId: patient.id,
          sourceHospitalId: sourceHospital.id,
          targetHospitalId: targetHospital.id,
          dataTypes: dataRequest.dataTypes,
          status: DataRequestStatus.IN_PROGRESS,
        });
        await this.delay(this.DEFENSE_STEP_DELAY_MS);
      }
      const deliveryReceipt = await this.deliverDataToHospital(
        sourceHospital,
        responseData,
      );
      const routedData = {
        retrievedFrom: targetHospital.id,
        deliveredTo: sourceHospital.id,
        deliveryReceipt,
        data: responseData,
      };

      const latencyMs = Date.now() - latencyStart;

      const consentRecordId =
        consentId && consentId !== 'consent_from_check' ? consentId : undefined;

      // Update request with response data
      const updatedRequest = await this.prisma.dataRequest.update({
        where: { id: dataRequest.id },
        data: {
          status: DataRequestStatus.COMPLETED,
          failureReason: null,
          responseData: JSON.stringify(routedData),
          consentRecordId,
          completedAt: new Date(),
          latencyMs,
        },
      });

      // Audit log
      await this.auditService.createAuditLog({
        action: 'data_request_completed',
        resourceType: 'data_request',
        resourceId: dataRequest.id,
        patientId: patient.id,
        hospitalId: sourceHospital.id,
        consentRecordId,
        status: 'success',
        details: JSON.stringify({
          targetHospital: targetHospital.id,
          deliveredTo: sourceHospital.id,
          dataTypes: dataRequest.dataTypes,
          latencyMs,
        }),
      });

      // Log data access if consent exists
      if (consentId && consentId !== 'consent_from_check') {
        await this.consentService.recordConsentAccess(consentId, sourceHospital.id);
      }

      this.defenseService.emit('data_request_completed', {
        dataRequestId: updatedRequest.id,
        patientId: patient.id,
        sourceHospitalId: sourceHospital.id,
        targetHospitalId: targetHospital.id,
        dataTypes: dataRequest.dataTypes,
        status: DataRequestStatus.COMPLETED,
        latencyMs,
        responseData: updatedRequest.responseData,
      });

      return this.mapDataRequestToResponse(updatedRequest);
    } catch (error) {
      const latencyMs = Date.now() - latencyStart;

      // Determine failure reason
      let failureReason = error.message;
      let status = DataRequestStatus.FAILED;

      if (error instanceof GatewayTimeoutException) {
        status = DataRequestStatus.TIMEOUT;
        failureReason = 'Request timeout - target hospital did not respond';
      } else if (error instanceof ServiceUnavailableException) {
        status = DataRequestStatus.FAILED;
        failureReason = 'Target hospital service unavailable';
      }

      const consentRecordId =
        consentId && consentId !== 'consent_from_check' ? consentId : undefined;

      // Update request with failure
      const updatedRequest = await this.prisma.dataRequest.update({
        where: { id: dataRequest.id },
        data: {
          status,
          failureReason,
          consentRecordId,
          completedAt: new Date(),
          latencyMs,
        },
      });

      // Audit log
      await this.auditService.createAuditLog({
        action: 'data_request_failed',
        resourceType: 'data_request',
        resourceId: dataRequest.id,
        patientId: dataRequest.patientId,
        hospitalId: sourceHospital.id,
        status: 'failed',
        details: JSON.stringify({
          targetHospital: targetHospital.id,
          error: failureReason,
          latencyMs,
        }),
      });

      this.defenseService.emit('data_request_failed', {
        dataRequestId: updatedRequest.id,
        patientId: dataRequest.patientId,
        sourceHospitalId: sourceHospital.id,
        targetHospitalId: targetHospital.id,
        dataTypes: dataRequest.dataTypes,
        status,
        failureReason,
        latencyMs,
      });

      throw error;
    }
  }

  /**
   * Fetch data from target hospital with retry logic
   */
  private async fetchDataFromHospital(
    targetHospital: any,
    patientId: string,
    dataTypes: DataType[],
  ): Promise<any> {
    const endpoint = `${targetHospital.endpoint}/api/v1/patient-data/${patientId}`;

    try {
      const response$ = this.httpService.get(endpoint, {
        params: {
          dataTypes: dataTypes.join(','),
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.HOSPITAL_API_TOKEN}`,
        },
      }).pipe(
        timeout(this.REQUEST_TIMEOUT_MS),
        retry({
          count: this.RETRY_ATTEMPTS - 1,
          delay: this.RETRY_DELAY_MS,
        }),
      );

      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new GatewayTimeoutException(
          `Target hospital request timeout after ${this.REQUEST_TIMEOUT_MS}ms`,
        );
      }

      if (error.response?.status === 503) {
        throw new ServiceUnavailableException(
          'Target hospital service unavailable',
        );
      }

      if (error.response?.status === 401) {
        throw new UnauthorizedException(
          'Authentication failed with target hospital',
        );
      }

      throw new BadRequestException(
        `Failed to fetch data from target hospital: ${error.message}`,
      );
    }
  }

  /**
   * Deliver fetched data to the requesting hospital.
   */
  private async deliverDataToHospital(
    destinationHospital: any,
    payload: any,
  ): Promise<any> {
    const endpoint = `${destinationHospital.endpoint}/api/v1/data-delivery`;

    try {
      const response$ = this.httpService.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.HOSPITAL_API_TOKEN}`,
        },
      }).pipe(
        timeout(this.REQUEST_TIMEOUT_MS),
        retry({
          count: this.RETRY_ATTEMPTS - 1,
          delay: this.RETRY_DELAY_MS,
        }),
      );

      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new GatewayTimeoutException(
          `Destination hospital delivery timeout after ${this.REQUEST_TIMEOUT_MS}ms`,
        );
      }

      if (error.response?.status === 503) {
        throw new ServiceUnavailableException(
          'Destination hospital service unavailable',
        );
      }

      if (error.response?.status === 401) {
        throw new UnauthorizedException(
          'Authentication failed with destination hospital',
        );
      }

      throw new BadRequestException(
        `Failed to deliver data to destination hospital: ${error.message}`,
      );
    }
  }

  /**
   * Get data request by ID
   */
  async getDataRequestById(id: string): Promise<DataRequestResponseDto> {
    const request = await this.prisma.dataRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new BadRequestException(`Data request "${id}" not found`);
    }

    return this.mapDataRequestToResponse(request);
  }

  /**
   * List data requests with filtering
   */
  async listDataRequests(
    query: ListDataRequestsQueryDto,
  ): Promise<ListDataRequestsResponseDto> {
    const skip = Math.max(0, query.skip || 0);
    const take = Math.min(query.take || 50, 500);

    const where: any = {};

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.sourceHospitalId) {
      where.sourceHospitalId = query.sourceHospitalId;
    }

    if (query.targetHospitalId) {
      where.targetHospitalId = query.targetHospitalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.dataRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.dataRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.mapDataRequestToResponse(r)),
      total,
      skip,
      take,
    };
  }

  /**
   * Get data requests for a patient
   */
  async getPatientDataRequests(
    patientId: string,
    skip = 0,
    take = 50,
  ): Promise<ListDataRequestsResponseDto> {
    if (take > 500) {
      take = 500;
    }

    const [requests, total] = await Promise.all([
      this.prisma.dataRequest.findMany({
        where: { patientId },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.dataRequest.count({ where: { patientId } }),
    ]);

    return {
      requests: requests.map((r) => this.mapDataRequestToResponse(r)),
      total,
      skip,
      take,
    };
  }

  /**
   * Get data requests for a hospital (as source)
   */
  async getHospitalDataRequests(
    hospitalId: string,
    skip = 0,
    take = 50,
  ): Promise<ListDataRequestsResponseDto> {
    if (take > 500) {
      take = 500;
    }

    const [requests, total] = await Promise.all([
      this.prisma.dataRequest.findMany({
        where: { sourceHospitalId: hospitalId },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.dataRequest.count({ where: { sourceHospitalId: hospitalId } }),
    ]);

    return {
      requests: requests.map((r) => this.mapDataRequestToResponse(r)),
      total,
      skip,
      take,
    };
  }

  /**
   * Get data requests targeting a hospital (as target)
   */
  async getIncomingDataRequests(
    hospitalId: string,
    skip = 0,
    take = 50,
  ): Promise<ListDataRequestsResponseDto> {
    if (take > 500) {
      take = 500;
    }

    const [requests, total] = await Promise.all([
      this.prisma.dataRequest.findMany({
        where: { targetHospitalId: hospitalId },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.dataRequest.count({
        where: { targetHospitalId: hospitalId },
      }),
    ]);

    return {
      requests: requests.map((r) => this.mapDataRequestToResponse(r)),
      total,
      skip,
      take,
    };
  }

  /**
   * Get data request statistics
   */
  async getDataRequestStats(hospitalId?: string) {
    const where: any = hospitalId ? { sourceHospitalId: hospitalId } : {};

    const [total, pending, completed, failed, timeout] = await Promise.all([
      this.prisma.dataRequest.count({ where }),
      this.prisma.dataRequest.count({
        where: { ...where, status: DataRequestStatus.PENDING },
      }),
      this.prisma.dataRequest.count({
        where: { ...where, status: DataRequestStatus.COMPLETED },
      }),
      this.prisma.dataRequest.count({
        where: { ...where, status: DataRequestStatus.FAILED },
      }),
      this.prisma.dataRequest.count({
        where: { ...where, status: DataRequestStatus.TIMEOUT },
      }),
    ]);

    // Calculate average latency for completed requests
    const completedRequests = await this.prisma.dataRequest.findMany({
      where: { ...where, status: DataRequestStatus.COMPLETED },
      select: { latencyMs: true },
    });

    const avgLatency =
      completedRequests.length > 0
        ? completedRequests.reduce((sum, r) => sum + (r.latencyMs || 0), 0) /
          completedRequests.length
        : 0;

    return {
      total,
      pending,
      completed,
      failed,
      timeout,
      successRate:
        total > 0 ? ((completed + pending) / total) * 100 : 0,
      averageLatencyMs: Math.round(avgLatency),
    };
  }

  // ============ Private Helper Methods ============

  private mapDataRequestToResponse(request: any): DataRequestResponseDto {
    return {
      id: request.id,
      patientId: request.patientId,
      sourceHospitalId: request.sourceHospitalId,
      targetHospitalId: request.targetHospitalId,
      dataTypes: request.dataTypes,
      purpose: request.purpose,
      notes: request.notes,
      status: request.status,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      failureReason: request.failureReason,
      responseData: this.parseResponseData(request.responseData),
      consentId: request.consentRecordId,
      latencyMs: request.latencyMs,
    };
  }

  private isDefenseDemoRequest(dataRequest: any): boolean {
    return String(dataRequest?.purpose || '').toLowerCase().includes('defense demo');
  }

  private delay(ms: number) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseResponseData(responseData: any): any {
    if (typeof responseData !== 'string') {
      return responseData;
    }

    try {
      return JSON.parse(responseData);
    } catch {
      return responseData;
    }
  }
}
