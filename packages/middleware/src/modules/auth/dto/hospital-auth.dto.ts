// CareBridge: Type-safe DTO contracts used for request/response validation.
import { IsOptional, IsString } from 'class-validator';

export class HospitalRegisterDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  redirectUri: string;

  @IsString()
  endpoint: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;
}

export class HospitalLoginDto {
  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;
}

export class HospitalAuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  hospital: {
    id: string;
    name: string;
    code: string;
    clientId: string;
  };
}
