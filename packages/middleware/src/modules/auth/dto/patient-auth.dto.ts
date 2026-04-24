import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class PatientSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  dateOfBirth?: Date;
  phoneNumber?: string;
}

export class PatientLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class PatientAuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  patient: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    externalId: string;
  };
}

export class PatientRefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  dateOfBirth?: Date | string;
}

export class ChangePatientPasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class RequestPatientPasswordResetDto {
  @IsEmail()
  email: string;
}

export class ConfirmPatientPasswordResetDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
