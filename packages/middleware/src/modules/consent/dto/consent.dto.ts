import { IsString, IsEmail, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateConsentRequestDto {
  @IsString()
  patientId: string;

  @IsString()
  requestingHospitalId: string;

  @IsString()
  dataType: string; // "allergies", "medications", "diagnoses", "lab_results", etc.

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // ISO 8601 date string
}

export class ApproveConsentRequestDto {
  @IsString()
  approvalCode: string; // Generated approval code for verification
}

export class DenyConsentRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RevokeConsentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConsentRequestResponseDto {
  id: string;
  patientId: string;
  requestingHospitalId: string;
  dataType: string;
  description: string;
  status: string; // pending, approved, denied, revoked
  expiresAt: Date;
  createdAt: Date;
  requestingHospital?: {
    id: string;
    name: string;
    code: string;
  };
}

export class ConsentRecordResponseDto {
  id: string;
  consentRequestId: string;
  patientId: string;
  requestingHospitalId: string;
  sourceHospitalId: string;
  dataType: string;
  accessCount: number;
  lastAccessedAt: Date;
  revokedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export class ListPendingConsentRequestsDto {
  requests: ConsentRequestResponseDto[];
  total: number;
}

export class ListActiveConsentsDto {
  consents: ConsentRecordResponseDto[];
  total: number;
}
