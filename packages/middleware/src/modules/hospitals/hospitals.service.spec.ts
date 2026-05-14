// CareBridge: Test coverage for this module behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('HospitalsService', () => {
  let service: HospitalsService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockHospital = {
    id: 'hosp-1',
    name: 'Test Hospital',
    code: 'TEST_HOSP',
    clientId: 'client_123',
    clientSecret: 'hashed_secret',
    redirectUri: 'http://localhost:4000/callback',
    endpoint: 'http://localhost:4000/api/v1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    hospital: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<HospitalsService>(HospitalsService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new hospital', async () => {
      const dto = {
        name: 'Test Hospital',
        code: 'TEST_HOSP',
        redirectUri: 'http://localhost:4000/callback',
        endpoint: 'http://localhost:4000/api/v1',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_secret');
      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrismaService.hospital.create as jest.Mock).mockResolvedValue(mockHospital);
      (mockJwtService.sign as jest.Mock).mockReturnValue('jwt_token');

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken', 'jwt_token');
      expect(result.hospital.name).toBe('Test Hospital');
      expect(mockPrismaService.hospital.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if hospital code already exists', async () => {
      const dto = {
        name: 'Test Hospital',
        code: 'EXISTING',
        redirectUri: 'http://localhost:4000/callback',
        endpoint: 'http://localhost:4000/api/v1',
      };

      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(mockHospital);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      const dto = {
        name: 'Test Hospital',
        code: '',
        redirectUri: '',
        endpoint: '',
      };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login a hospital with valid credentials', async () => {
      const dto = {
        clientId: 'client_123',
        clientSecret: 'secret_123',
      };

      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(mockHospital);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwtService.sign as jest.Mock).mockReturnValue('jwt_token');

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken', 'jwt_token');
      expect(result.hospital.code).toBe('TEST_HOSP');
    });

    it('should throw UnauthorizedException for invalid clientId', async () => {
      const dto = {
        clientId: 'invalid_client',
        clientSecret: 'secret_123',
      };

      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid clientSecret', async () => {
      const dto = {
        clientId: 'client_123',
        clientSecret: 'wrong_secret',
      };

      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(mockHospital);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive hospital', async () => {
      const inactiveHospital = { ...mockHospital, isActive: false };
      const dto = {
        clientId: 'client_123',
        clientSecret: 'secret_123',
      };

      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(inactiveHospital);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getHospitalById', () => {
    it('should return hospital by id', async () => {
      const expectedResult = {
        id: 'hosp-1',
        name: 'Test Hospital',
        code: 'TEST_HOSP',
        endpoint: 'http://localhost:4000/api/v1',
        isActive: true,
        createdAt: new Date(),
      };

      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getHospitalById('hosp-1');

      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if hospital not found', async () => {
      (mockPrismaService.hospital.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getHospitalById('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });
});
