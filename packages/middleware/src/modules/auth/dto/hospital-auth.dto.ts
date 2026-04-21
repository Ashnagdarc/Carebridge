export class HospitalRegisterDto {
  name: string;
  code: string;
  redirectUri: string;
  endpoint: string;
  contactEmail?: string;
}

export class HospitalLoginDto {
  clientId: string;
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
