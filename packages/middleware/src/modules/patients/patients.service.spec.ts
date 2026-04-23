import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../email/email.service';

jest.mock('bcryptjs');

describe('PatientsService', () => {
  let service: PatientsService;
  let prismaService: any;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            session: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
            passwordResetToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    prismaService = module.get(PrismaService) as any;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    emailService = module.get(EmailService) as jest.Mocked<EmailService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should successfully create a new patient account', async () => {
      const signupDto = {
        email: 'patient@example.com',
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashed_password_here';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const newPatient = {
        id: 'pat_uuid_1',
        externalId: 'PAT-ABC123DEF456',
        email: signupDto.email,
        passwordHash: hashedPassword,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        dateOfBirth: null,
        phoneNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.patient.findUnique.mockResolvedValue(null);
      prismaService.patient.create.mockResolvedValue(newPatient);
      jwtService.sign.mockReturnValueOnce('access_token_jwt');
      jwtService.sign.mockReturnValueOnce('refresh_token_jwt');
      prismaService.session.create.mockResolvedValue({} as any);

      const result = await service.signup(signupDto);

      expect(result.accessToken).toBe('access_token_jwt');
      expect(result.refreshToken).toBe('refresh_token_jwt');
      expect(result.tokenType).toBe('Bearer');
      expect(result.patient.email).toBe(signupDto.email);
      expect(prismaService.patient.create).toHaveBeenCalled();
      expect(prismaService.session.create).toHaveBeenCalled();
    });

    it('should normalize signup email before lookup and create', async () => {
      const signupDto = {
        email: ' Patient@Example.COM ',
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashed_password_here';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaService.patient.findUnique.mockResolvedValue(null);
      prismaService.patient.create.mockResolvedValue({
        id: 'pat_uuid_1',
        externalId: 'PAT-ABC123DEF456',
        email: 'patient@example.com',
        passwordHash: hashedPassword,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        dateOfBirth: null,
        phoneNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      jwtService.sign.mockReturnValueOnce('access_token_jwt');
      jwtService.sign.mockReturnValueOnce('refresh_token_jwt');
      prismaService.session.create.mockResolvedValue({} as any);

      await service.signup(signupDto);

      expect(prismaService.patient.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'patient@example.com' },
        }),
      );
      expect(prismaService.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'patient@example.com' }),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      const signupDto = {
        email: 'patient@example.com',
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      prismaService.patient.findUnique.mockResolvedValue({ email: signupDto.email } as any);

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('should reject missing required fields', async () => {
      const incompleteDto = {
        email: 'patient@example.com',
        password: 'SecurePassword123',
        firstName: '',
        lastName: 'Doe',
      };

      prismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.signup(incompleteDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate patient and return tokens', async () => {
      const loginDto = {
        email: 'patient@example.com',
        password: 'SecurePassword123',
      };

      const patient = {
        id: 'pat_uuid_1',
        externalId: 'PAT-ABC123DEF456',
        email: loginDto.email,
        passwordHash: 'hashed_password_here',
        firstName: 'John',
        lastName: 'Doe',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      jwtService.sign.mockReturnValueOnce('access_token_jwt');
      jwtService.sign.mockReturnValueOnce('refresh_token_jwt');
      prismaService.session.create.mockResolvedValue({} as any);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('access_token_jwt');
      expect(result.patient.email).toBe(loginDto.email);
      expect(prismaService.session.create).toHaveBeenCalled();
    });

    it('should normalize login email before lookup', async () => {
      const loginDto = {
        email: ' Patient@Example.COM ',
        password: 'SecurePassword123',
      };

      const patient = {
        id: 'pat_uuid_1',
        externalId: 'PAT-ABC123DEF456',
        email: 'patient@example.com',
        passwordHash: 'hashed_password_here',
        firstName: 'John',
        lastName: 'Doe',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      jwtService.sign.mockReturnValueOnce('access_token_jwt');
      jwtService.sign.mockReturnValueOnce('refresh_token_jwt');
      prismaService.session.create.mockResolvedValue({} as any);

      await service.login(loginDto);

      expect(prismaService.patient.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'patient@example.com' } }),
      );
    });

    it('should reject invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123',
      };

      prismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password', async () => {
      const loginDto = {
        email: 'patient@example.com',
        password: 'WrongPassword123',
      };

      const patient = {
        id: 'pat_uuid_1',
        externalId: 'PAT-ABC123DEF456',
        email: loginDto.email,
        passwordHash: 'hashed_password_here',
        firstName: 'John',
        lastName: 'Doe',
      };

      prismaService.patient.findUnique.mockResolvedValue(patient as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke patient session', async () => {
      const patientId = 'pat_uuid_1';
      const token = 'some_token';

      prismaService.session.updateMany.mockResolvedValue({ count: 1 } as any);

      await service.logout(patientId, token);

      expect(prismaService.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId, token },
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('updatePatientProfile', () => {
    it('should update patient profile fields', async () => {
      const updatedPatient = {
        id: 'pat_uuid_1',
        email: 'patient@example.com',
        externalId: 'PAT-ABC123DEF456',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: null,
        dateOfBirth: new Date('1990-01-01'),
        createdAt: new Date(),
      };

      prismaService.patient.update.mockResolvedValue(updatedPatient);

      const result = await service.updatePatientProfile('pat_uuid_1', {
        firstName: ' Jane ',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      });

      expect(result.firstName).toBe('Jane');
      expect(prismaService.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pat_uuid_1' },
          data: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Doe',
            dateOfBirth: expect.any(Date),
          }),
        }),
      );
    });

    it('should reject empty profile updates', async () => {
      await expect(service.updatePatientProfile('pat_uuid_1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    it('should update password and revoke active sessions', async () => {
      prismaService.patient.findUnique.mockResolvedValue({
        id: 'pat_uuid_1',
        passwordHash: 'old_hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      prismaService.patient.update.mockResolvedValue({} as any);
      prismaService.session.updateMany.mockResolvedValue({ count: 2 } as any);

      await service.changePassword('pat_uuid_1', {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      });

      expect(prismaService.patient.update).toHaveBeenCalledWith({
        where: { id: 'pat_uuid_1' },
        data: { passwordHash: 'new_hash' },
      });
      expect(prismaService.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'pat_uuid_1', revokedAt: null },
        }),
      );
    });

    it('should reject an invalid current password', async () => {
      prismaService.patient.findUnique.mockResolvedValue({
        id: 'pat_uuid_1',
        passwordHash: 'old_hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('pat_uuid_1', {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should create a token and send a reset email for an existing patient', async () => {
      prismaService.patient.findUnique.mockResolvedValue({
        id: 'pat_uuid_1',
        email: 'patient@example.com',
        firstName: 'Amina',
      } as any);
      prismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 } as any);
      prismaService.passwordResetToken.create.mockResolvedValue({} as any);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset({ email: 'PATIENT@example.com ' });

      expect(prismaService.passwordResetToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'pat_uuid_1',
            usedAt: null,
          }),
          data: { usedAt: expect.any(Date) },
        }),
      );
      expect(prismaService.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'pat_uuid_1',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'patient@example.com',
        expect.stringMatching(/^http:\/\/localhost:3001\/reset-password\?token=/),
        'Amina',
      );
    });

    it('should not reveal unknown email addresses', async () => {
      prismaService.patient.findUnique.mockResolvedValue(null);

      await service.requestPasswordReset({ email: 'missing@example.com' });

      expect(prismaService.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('confirmPasswordReset', () => {
    it('should reset password, mark token used, and revoke sessions', async () => {
      const expiresAt = new Date(Date.now() + 100000);
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset_1',
        patientId: 'pat_uuid_1',
        tokenHash: 'hash',
        expiresAt,
        usedAt: null,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      prismaService.patient.update.mockResolvedValue({} as any);
      prismaService.passwordResetToken.update.mockResolvedValue({} as any);
      prismaService.session.updateMany.mockResolvedValue({ count: 2 } as any);

      await service.confirmPasswordReset({
        token: 'plain-token',
        newPassword: 'NewPassword123',
      });

      expect(prismaService.patient.update).toHaveBeenCalledWith({
        where: { id: 'pat_uuid_1' },
        data: { passwordHash: 'new_hash' },
      });
      expect(prismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'reset_1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaService.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'pat_uuid_1', revokedAt: null },
        }),
      );
    });

    it('should reject expired reset tokens', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset_1',
        patientId: 'pat_uuid_1',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      } as any);

      await expect(
        service.confirmPasswordReset({
          token: 'plain-token',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logoutAll', () => {
    it('should revoke all active patient sessions', async () => {
      prismaService.session.updateMany.mockResolvedValue({ count: 2 } as any);

      await service.logoutAll('pat_uuid_1');

      expect(prismaService.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'pat_uuid_1', revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete the patient account', async () => {
      prismaService.patient.delete.mockResolvedValue({} as any);

      await service.deleteAccount('pat_uuid_1');

      expect(prismaService.patient.delete).toHaveBeenCalledWith({
        where: { id: 'pat_uuid_1' },
      });
    });
  });

  describe('listSessions', () => {
    it('should list sessions with active and current flags', async () => {
      const now = Date.now();
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 'sess_1',
          token: 'access_1',
          expiresAt: new Date(now + 1000),
          revokedAt: null,
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 500),
        },
        {
          id: 'sess_2',
          token: 'access_2',
          expiresAt: new Date(now - 1000),
          revokedAt: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 1500),
        },
        {
          id: 'sess_3',
          token: 'access_3',
          expiresAt: new Date(now + 1000),
          revokedAt: new Date(now - 10),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(now - 3000),
          updatedAt: new Date(now - 2500),
        },
      ]);

      const result = await service.listSessions('pat_uuid_1', 'access_1');

      expect(result.total).toBe(3);
      expect(result.activeCount).toBe(1);
      expect(result.sessions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'sess_1',
            isActive: true,
            isCurrent: true,
          }),
          expect.objectContaining({
            id: 'sess_2',
            isActive: false,
            isCurrent: false,
          }),
        ]),
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session belonging to the patient', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        id: 'sess_1',
        patientId: 'pat_uuid_1',
        revokedAt: null,
      } as any);
      prismaService.session.update.mockResolvedValue({} as any);

      await service.revokeSession('pat_uuid_1', 'sess_1');

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'sess_1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject revoking a session not belonging to the patient', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        id: 'sess_other',
        patientId: 'someone_else',
        revokedAt: null,
      } as any);

      await expect(service.revokeSession('pat_uuid_1', 'sess_other')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refresh', () => {
    it('should generate new tokens from refresh token', async () => {
      const refreshToken = 'refresh_token_jwt';
      const session = {
        id: 'session_1',
        patientId: 'pat_uuid_1',
        token: 'old_access_token',
        refreshToken,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        patient: {
          id: 'pat_uuid_1',
          externalId: 'PAT-ABC123DEF456',
          email: 'patient@example.com',
          firstName: 'John',
          lastName: 'Doe',
          passwordHash: 'hashed',
          dateOfBirth: null,
          phoneNumber: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      jwtService.verify.mockReturnValue({ patientId: 'pat_uuid_1', type: 'refresh' });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      jwtService.sign.mockReturnValueOnce('new_access_token');
      jwtService.sign.mockReturnValueOnce('new_refresh_token');
      prismaService.session.update.mockResolvedValue({} as any);

      const result = await service.refresh({ refreshToken });

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');      expect(prismaService.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { refreshToken } }),
      );      expect(prismaService.session.update).toHaveBeenCalled();
    });

    it('should reject invalid refresh token', async () => {
      const refreshToken = 'invalid_token';

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh({ refreshToken })).rejects.toThrow(UnauthorizedException);
    });
  });
});
