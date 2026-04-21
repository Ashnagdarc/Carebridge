import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { HospitalRegisterDto, HospitalLoginDto, HospitalAuthResponseDto } from '@modules/auth/dto/hospital-auth.dto';

@Injectable()
export class HospitalsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: HospitalRegisterDto): Promise<HospitalAuthResponseDto> {
    // Validate input
    if (!dto.name || !dto.code || !dto.redirectUri || !dto.endpoint) {
      throw new BadRequestException('Missing required fields: name, code, redirectUri, endpoint');
    }

    // Check if hospital code already exists
    const existingHospital = await this.prisma.hospital.findUnique({
      where: { code: dto.code },
    });

    if (existingHospital) {
      throw new ConflictException(`Hospital with code "${dto.code}" already exists`);
    }

    // Generate OAuth2 credentials
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await bcrypt.hash(clientSecret, 10);

    // Create hospital record
    const hospital = await this.prisma.hospital.create({
      data: {
        name: dto.name,
        code: dto.code,
        clientId,
        clientSecret: clientSecretHash,
        redirectUri: dto.redirectUri,
        endpoint: dto.endpoint,
        isActive: true,
      },
    });

    // Generate JWT token
    const accessToken = this.jwtService.sign(
      {
        hospitalId: hospital.id,
        code: hospital.code,
        type: 'hospital',
      },
      {
        expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      },
    );

    return {
      accessToken,
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      tokenType: 'Bearer',
      hospital: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        clientId,
      },
    };
  }

  async login(dto: HospitalLoginDto): Promise<HospitalAuthResponseDto> {
    // Validate input
    if (!dto.clientId || !dto.clientSecret) {
      throw new BadRequestException('clientId and clientSecret are required');
    }

    // Find hospital by clientId
    const hospital = await this.prisma.hospital.findUnique({
      where: { clientId: dto.clientId },
    });

    if (!hospital) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify clientSecret
    const isSecretValid = await bcrypt.compare(dto.clientSecret, hospital.clientSecret);
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!hospital.isActive) {
      throw new UnauthorizedException('Hospital account is inactive');
    }

    // Generate JWT token
    const accessToken = this.jwtService.sign(
      {
        hospitalId: hospital.id,
        code: hospital.code,
        type: 'hospital',
      },
      {
        expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      },
    );

    return {
      accessToken,
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      tokenType: 'Bearer',
      hospital: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        clientId: hospital.clientId,
      },
    };
  }

  async getHospitalById(id: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        endpoint: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!hospital) {
      throw new BadRequestException('Hospital not found');
    }

    return hospital;
  }

  async getHospitals() {
    return this.prisma.hospital.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async validateHospitalToken(hospitalId: string): Promise<any> {
    const hospital = await this.getHospitalById(hospitalId);
    return hospital;
  }

  private generateClientId(): string {
    return `hosp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateClientSecret(): string {
    return `secret_${Math.random().toString(36).substring(2, 32)}_${Math.random().toString(36).substring(2, 32)}`;
  }
}
