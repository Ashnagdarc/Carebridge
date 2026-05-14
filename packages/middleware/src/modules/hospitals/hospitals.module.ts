// CareBridge: Hospital identity and integration endpoint management.
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HospitalsService } from './hospitals.service';
import { HospitalsController } from './hospitals.controller';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '@src/common/prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
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
  controllers: [HospitalsController],
  providers: [HospitalsService, JwtStrategy, PrismaService],
  exports: [HospitalsService],
})
export class HospitalsModule {}
