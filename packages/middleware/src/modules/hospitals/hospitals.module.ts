import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HospitalsService } from './hospitals.service';
import { HospitalsController } from './hospitals.controller';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '@src/common/prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_jwt_secret_key',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '86400') as any },
    }),
  ],
  controllers: [HospitalsController],
  providers: [HospitalsService, JwtStrategy, PrismaService],
  exports: [HospitalsService],
})
export class HospitalsModule {}
