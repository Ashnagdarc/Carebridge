// CareBridge: Type-safe DTO contracts used for request/response validation.
import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  action: string; // "consent_requested", "patient_login", "hospital_register", etc.

  @IsString()
  resourceType: string; // "patient", "hospital", "consent", "consent_record", etc.

  @IsString()
  resourceId: string; // ID of the resource being acted upon

  @IsOptional()
  @IsString()
  patientId?: string; // Patient involved (if applicable)

  @IsOptional()
  @IsString()
  hospitalId?: string; // Hospital involved (if applicable)

  @IsOptional()
  @IsString()
  consentRecordId?: string; // Consent record involved (if applicable)

  @IsOptional()
  @IsString()
  details?: string; // JSON-encoded additional details

  @IsOptional()
  @IsString()
  ipAddress?: string; // Source IP address

  @IsOptional()
  @IsString()
  userAgent?: string; // Browser/client user agent

  @IsString()
  status: string; // "success", "failed", "unauthorized", etc.
}

export class AuditLogResponseDto {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  patientId?: string;
  hospitalId?: string;
  consentRecordId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  createdAt: Date;
}

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  action?: string; // Filter by action

  @IsOptional()
  @IsString()
  resourceType?: string; // Filter by resource type

  @IsOptional()
  @IsString()
  patientId?: string; // Filter by patient

  @IsOptional()
  @IsString()
  hospitalId?: string; // Filter by hospital

  @IsOptional()
  @IsString()
  status?: string; // Filter by status

  @IsOptional()
  @IsDateString()
  startDate?: string; // Filter by date range start

  @IsOptional()
  @IsDateString()
  endDate?: string; // Filter by date range end

  @IsOptional()
  @IsString()
  sortBy?: string; // Field to sort by (default: createdAt)

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc'; // Sort order (default: desc)

  @IsOptional()
  skip?: number; // Pagination skip (default: 0)

  @IsOptional()
  take?: number; // Pagination take (default: 50, max: 500)
}

export class ListAuditLogsResponseDto {
  logs: AuditLogResponseDto[];
  total: number;
  skip: number;
  take: number;
}
