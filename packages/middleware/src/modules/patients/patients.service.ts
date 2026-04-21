import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { PatientSignupDto, PatientLoginDto, PatientAuthResponseDto, PatientRefreshDto } from '@modules/auth/dto/patient-auth.dto';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: PatientSignupDto): Promise<PatientAuthResponseDto> {
    // Validate input
    if (!dto.email || !dto.password || !dto.firstName || !dto.lastName) {
      throw new BadRequestException('Missing required fields: email, password, firstName, lastName');
    }

    // Check if email already exists
    const existingPatient = await this.prisma.patient.findUnique({
      where: { email: dto.email },
    });

    if (existingPatient) {
      throw new ConflictException(`Patient with email "${dto.email}" already exists`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Generate external ID (UID)
    const externalId = this.generatePatientUID();

    // Create patient record
    const patient = await this.prisma.patient.create({
      data: {
        externalId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        phoneNumber: dto.phoneNumber || null,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens({
      patientId: patient.id,
      email: patient.email,
      externalId: patient.externalId,
    });

    // Create session
    await this.prisma.session.create({
      data: {
        patientId: patient.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + parseInt(process.env.JWT_EXPIRATION || '86400') * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      tokenType: 'Bearer',
      patient: {
        id: patient.id,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        externalId: patient.externalId,
      },
    };
  }

  async login(dto: PatientLoginDto): Promise<PatientAuthResponseDto> {
    // Validate input
    if (!dto.email || !dto.password) {
      throw new BadRequestException('email and password are required');
    }

    // Find patient by email
    const patient = await this.prisma.patient.findUnique({
      where: { email: dto.email },
    });

    if (!patient) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, patient.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens({
      patientId: patient.id,
      email: patient.email,
      externalId: patient.externalId,
    });

    // Create session
    await this.prisma.session.create({
      data: {
        patientId: patient.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + parseInt(process.env.JWT_EXPIRATION || '86400') * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      tokenType: 'Bearer',
      patient: {
        id: patient.id,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        externalId: patient.externalId,
      },
    };
  }

  async refresh(dto: PatientRefreshDto): Promise<PatientAuthResponseDto> {
    if (!dto.refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }

    try {
      // Verify refresh token
      const decoded = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_SECRET || 'dev_jwt_secret_key',
      });

      // Find session
      const session = await this.prisma.session.findUnique({
        where: { token: dto.refreshToken },
        include: { patient: true },
      });

      if (!session || session.revokedAt) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (new Date() > session.expiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new tokens
      const { accessToken, refreshToken } = this.generateTokens({
        patientId: session.patient.id,
        email: session.patient.email,
        externalId: session.patient.externalId,
      });

      // Update session
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          token: accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + parseInt(process.env.JWT_EXPIRATION || '86400') * 1000),
        },
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
        tokenType: 'Bearer',
        patient: {
          id: session.patient.id,
          email: session.patient.email,
          firstName: session.patient.firstName,
          lastName: session.patient.lastName,
          externalId: session.patient.externalId,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(patientId: string, token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        patientId,
        token,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getPatientProfile(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        email: true,
        externalId: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    return patient;
  }

  async validatePatientToken(patientId: string): Promise<any> {
    const patient = await this.getPatientProfile(patientId);
    return patient;
  }

  private generateTokens(payload: any) {
    const accessToken = this.jwtService.sign(
      {
        patientId: payload.patientId,
        email: payload.email,
        externalId: payload.externalId,
        type: 'patient',
      },
      {
        expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'),
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        patientId: payload.patientId,
        type: 'refresh',
      },
      {
        expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION || '2592000'),
      },
    );

    return { accessToken, refreshToken };
  }

  private generatePatientUID(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let uid = '';
    for (let i = 0; i < 12; i++) {
      uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PAT-${uid}`;
  }
}
