import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PatientJwtStrategy } from '../auth/strategies/patient-jwt.strategy';
import { PrismaService } from '@src/common/prisma/prisma.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'patient-jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_jwt_secret_key',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '86400') as any },
    }),
  ],
  providers: [PatientsService, PatientJwtStrategy, PrismaService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
