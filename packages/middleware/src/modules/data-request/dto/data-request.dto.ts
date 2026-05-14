// CareBridge: Type-safe DTO contracts used for request/response validation.
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum DataRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum DataType {
  ALLERGIES = 'allergies',
  MEDICATIONS = 'medications',
  DIAGNOSES = 'diagnoses',
  VITAL_SIGNS = 'vital_signs',
  LAB_RESULTS = 'lab_results',
  BLOOD_TESTS = 'blood_tests',
  BLOOD_GROUP = 'blood_group',
  PROCEDURES = 'procedures',
  IMMUNIZATIONS = 'immunizations',
  HEALTH_HISTORY = 'health_history',
  ALL = 'all',
}

export class CreateDataRequestDto {
  @IsString()
  patientId: string; // Patient whose data is being requested

  @IsString()
  sourceHospitalId: string; // Hospital initiating the request

  @IsString()
  targetHospitalId: string; // Hospital holding the source data

  @IsArray()
  dataTypes: DataType[]; // Types of data being requested

  @IsOptional()
  @IsString()
  purpose?: string; // Reason for data request (clinical, research, transfer, etc.)

  @IsOptional()
  @IsString()
  notes?: string; // Additional notes
}

export class DataRequestResponseDto {
  id: string;
  patientId: string;
  sourceHospitalId: string;
  targetHospitalId: string;
  dataTypes: DataType[];
  purpose?: string;
  notes?: string;
  status: DataRequestStatus;
  requestedAt: Date;
  completedAt?: Date;
  failureReason?: string;
  responseData?: any; // The actual fetched data
  consentId?: string; // Consent record used for authorization
  latencyMs?: number; // Response time in milliseconds
}

export class ListDataRequestsQueryDto {
  @IsOptional()
  @IsString()
  patientId?: string; // Filter by patient

  @IsOptional()
  @IsString()
  sourceHospitalId?: string; // Filter by requesting hospital

  @IsOptional()
  @IsString()
  targetHospitalId?: string; // Filter by source hospital

  @IsOptional()
  @IsEnum(DataRequestStatus)
  status?: DataRequestStatus; // Filter by status

  @IsOptional()
  skip?: number; // Pagination skip (default: 0)

  @IsOptional()
  take?: number; // Pagination take (default: 50, max: 500)
}

export class ListDataRequestsResponseDto {
  requests: DataRequestResponseDto[];
  total: number;
  skip: number;
  take: number;
}

export class DataRequestErrorDto {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}
