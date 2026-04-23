import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@src/common/prisma/prisma.service';
import {
  ChangePatientPasswordDto,
  ConfirmPatientPasswordResetDto,
  PatientAuthResponseDto,
  PatientLoginDto,
  PatientRefreshDto,
  PatientSignupDto,
  RequestPatientPasswordResetDto,
  UpdatePatientProfileDto,
} from '@modules/auth/dto/patient-auth.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async signup(dto: PatientSignupDto): Promise<PatientAuthResponseDto> {
    // Validate input
    if (!dto.email || !dto.password || !dto.firstName || !dto.lastName) {
      throw new BadRequestException('Missing required fields: email, password, firstName, lastName');
    }

    const email = dto.email.trim().toLowerCase();

    // Check if email already exists
    const existingPatient = await this.prisma.patient.findUnique({
      where: { email },
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
        email,
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

    const email = dto.email.trim().toLowerCase();

    // Find patient by email
    const patient = await this.prisma.patient.findUnique({
      where: { email },
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
        where: { refreshToken: dto.refreshToken },
        include: { patient: true },
      });

      if (!session || session.revokedAt) {
        throw new UnauthorizedException('Invalid refresh token');
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

  async updatePatientProfile(patientId: string, dto: UpdatePatientProfileDto) {
    const data: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: Date | null;
    } = {};

    if (dto.firstName !== undefined) {
      const firstName = dto.firstName.trim();
      if (!firstName) {
        throw new BadRequestException('firstName cannot be empty');
      }
      data.firstName = firstName;
    }

    if (dto.lastName !== undefined) {
      const lastName = dto.lastName.trim();
      if (!lastName) {
        throw new BadRequestException('lastName cannot be empty');
      }
      data.lastName = lastName;
    }

    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
      if (data.dateOfBirth && Number.isNaN(data.dateOfBirth.getTime())) {
        throw new BadRequestException('dateOfBirth must be a valid date');
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No profile fields provided');
    }

    const patient = await this.prisma.patient.update({
      where: { id: patientId },
      data,
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

    return patient;
  }

  async changePassword(patientId: string, dto: ChangePatientPasswordDto): Promise<void> {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, patient.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.patient.update({
      where: { id: patientId },
      data: { passwordHash },
    });

    await this.logoutAll(patientId);
  }

  async requestPasswordReset(dto: RequestPatientPasswordResetDto): Promise<void> {
    if (!dto.email) {
      throw new BadRequestException('email is required');
    }

    const email = dto.email.trim().toLowerCase();
    const patient = await this.prisma.patient.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    if (!patient) {
      return;
    }

    await this.prisma.passwordResetToken.updateMany({
      where: {
        patientId: patient.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + this.passwordResetTtlMs());

    await this.prisma.passwordResetToken.create({
      data: {
        patientId: patient.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = (process.env.APP_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordResetEmail(patient.email, resetUrl, patient.firstName);
  }

  async confirmPasswordReset(dto: ConfirmPatientPasswordResetDto): Promise<void> {
    if (!dto.token || !dto.newPassword) {
      throw new BadRequestException('token and newPassword are required');
    }

    const tokenHash = this.hashResetToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('Password reset link is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.patient.update({
      where: { id: resetToken.patientId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await this.logoutAll(resetToken.patientId);
  }

  async logoutAll(patientId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        patientId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async listSessions(patientId: string, currentToken?: string) {
    const sessions = await this.prisma.session.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        revokedAt: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const now = Date.now();
    const mapped = sessions.map((session) => {
      const isActive =
        session.revokedAt === null && session.expiresAt.getTime() > now;

      return {
        id: session.id,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isActive,
        isCurrent: Boolean(currentToken && session.token === currentToken),
      };
    });

    return {
      sessions: mapped,
      total: mapped.length,
      activeCount: mapped.filter((s) => s.isActive).length,
    };
  }

  async revokeSession(patientId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        patientId: true,
        revokedAt: true,
      },
    });

    if (!session || session.patientId !== patientId) {
      throw new BadRequestException('Session not found');
    }

    if (session.revokedAt) {
      return;
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async deleteAccount(patientId: string): Promise<void> {
    await this.prisma.patient.delete({
      where: { id: patientId },
    });
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

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private passwordResetTtlMs(): number {
    const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || '30');
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
    return safeMinutes * 60 * 1000;
  }
}
