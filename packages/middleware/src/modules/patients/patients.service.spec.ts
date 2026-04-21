import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('PatientsService', () => {
  let service: PatientsService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

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
            },
            session: {
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
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
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
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(prismaService.session.update).toHaveBeenCalled();
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
