import { IsEmail, IsString, MinLength } from 'class-validator';

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
  @IsString()
  refreshToken: string;
}
