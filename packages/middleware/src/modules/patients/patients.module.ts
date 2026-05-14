// CareBridge: Patient account, profile, and session management.
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PatientJwtStrategy } from '../auth/strategies/patient-jwt.strategy';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'patient-jwt' }),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is required');
        return {
          secret,
          signOptions: { expiresIn: (config.get<string>('JWT_EXPIRATION') || '86400') as any },
        };
      },
    }),
  ],
  providers: [PatientsService, PatientJwtStrategy, PrismaService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
