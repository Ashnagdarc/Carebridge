import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma/prisma.service';
import {
  CreateAuditLogDto,
  ListAuditLogsQueryDto,
  ListAuditLogsResponseDto,
  AuditLogResponseDto,
} from './dto/audit.dto';

@Injectable()
export class AuditService {
  private readonly SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'token',
     'accesstoken',
     'refreshtoken',
     'clientsecret',
     'apikey',
     'secretkey',
     'creditcard',
    'ssn',
     'authorization',
  ];

  private readonly SENSITIVE_PATHS = [
    'password',
    'confirmPassword',
     'clientsecret',
     'apikey',
     'secretkey',
    'Authorization',
    'X-API-Key',
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async createAuditLog(dto: CreateAuditLogDto): Promise<AuditLogResponseDto> {
    if (!dto.action || !dto.resourceType || !dto.resourceId) {
      throw new BadRequestException(
        'action, resourceType, and resourceId are required',
      );
    }

    const auditLog = await this.prisma.auditLog.create({
      data: {
        action: dto.action,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        patientId: dto.patientId || null,
        hospitalId: dto.hospitalId || null,
        consentRecordId: dto.consentRecordId || null,
        details: dto.details || null,
        ipAddress: dto.ipAddress || null,
        userAgent: dto.userAgent || null,
        status: dto.status,
      },
    });

    return this.mapAuditLogToResponse(auditLog);
  }

  /**
   * Query audit logs with filters
   */
  async listAuditLogs(
    query: ListAuditLogsQueryDto,
  ): Promise<ListAuditLogsResponseDto> {
    // Validate pagination
    const skip = Math.max(0, query.skip || 0);
    const take = Math.min(query.take || 50, 500); // Max 500 per request

    // Build filter conditions
    const where: any = {};

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.resourceType) {
      where.resourceType = { contains: query.resourceType, mode: 'insensitive' };
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }

    if (query.status) {
      where.status = { contains: query.status, mode: 'insensitive' };
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};

      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }

      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Sort options
    const orderBy: any = {};
    const sortField = query.sortBy || 'createdAt';
    const order = query.order || 'desc';
    orderBy[sortField] = order;

    // Execute queries
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(this.mapAuditLogToResponse),
      total,
      skip,
      take,
    };
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string): Promise<AuditLogResponseDto> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new BadRequestException(`Audit log with ID "${id}" not found`);
    }

    return this.mapAuditLogToResponse(log);
  }

  /**
   * Get audit logs for a specific patient
   */
  async getPatientAuditLogs(patientId: string, skip = 0, take = 50) {
    if (take > 500) {
      take = 500;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where: { patientId } }),
    ]);

    return {
      logs: logs.map(this.mapAuditLogToResponse),
      total,
      skip,
      take,
    };
  }

  /**
   * Get audit logs for a specific hospital
   */
  async getHospitalAuditLogs(hospitalId: string, skip = 0, take = 50) {
    if (take > 500) {
      take = 500;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { hospitalId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where: { hospitalId } }),
    ]);

    return {
      logs: logs.map(this.mapAuditLogToResponse),
      total,
      skip,
      take,
    };
  }

  /**
   * Get recent audit activity summary
   */
  async getAuditSummary(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, successCount, failedCount, byAction] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate }, status: 'success' },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate }, status: 'failed' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
      }),
    ]);

    return {
      totalLogs,
      successCount,
      failedCount,
      successRate: totalLogs > 0 ? (successCount / totalLogs) * 100 : 0,
      byAction: byAction.map((item: any) => ({
        action: item.action,
        count: item._count.id,
      })),
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
    };
  }

  /**
   * Mask sensitive data in request/response
   */
  maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = { ...data };

    // Mask request body fields
    if (masked.body && typeof masked.body === 'object') {
      masked.body = this.maskObjectFields(masked.body);
    }

    // Mask request query fields
    if (masked.query && typeof masked.query === 'object') {
      masked.query = this.maskObjectFields(masked.query);
    }

    // Mask request headers
    if (masked.headers && typeof masked.headers === 'object') {
      masked.headers = this.maskHeaderFields(masked.headers);
    }

    return masked;
  }

  /**
   * Mask object fields recursively
   */
  private maskObjectFields(obj: any, depth = 0): any {
    if (depth > 10 || !obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObjectFields(item, depth + 1));
    }

    const masked: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        masked[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObjectFields(value, depth + 1);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Mask sensitive header fields
   */
  private maskHeaderFields(headers: any): any {
    const masked: any = {};

    for (const [key, value] of Object.entries(headers)) {
      if (
        this.SENSITIVE_PATHS.includes(key) ||
        key.toLowerCase().includes('authorization') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret')
      ) {
        masked[key] = '***REDACTED***';
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Format action for logging
   */
  formatAction(method: string, path: string): string {
    const parts = path.split("/").filter((p) => p && p !== "api");
    if (parts.length === 0) return "unknown";
    return parts.join("_").toLowerCase();
  }

  /**
   * Format resource type from path
   */
  formatResourceType(path: string): string {
    const parts = path.split('/').filter((p) => p && p !== 'api');
    return (parts[0] || 'unknown').toLowerCase();
  }

  // ============ Private Helper Methods ============

  private mapAuditLogToResponse(log: any): AuditLogResponseDto {
    return {
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      patientId: log.patientId,
      hospitalId: log.hospitalId,
      consentRecordId: log.consentRecordId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      status: log.status,
      createdAt: log.createdAt,
    };
  }
}
