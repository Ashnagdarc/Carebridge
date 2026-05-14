// CareBridge: CareBridge application source file.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConsentModule } from './modules/consent/consent.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { DataRequestModule } from './modules/data-request/data-request.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DefenseModule } from './modules/defense/defense.module';
import { PrismaService } from './common/prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const windowMsRaw = configService.get<string>('RATE_LIMIT_WINDOW_MS') ?? '900000';
        const limitRaw = configService.get<string>('RATE_LIMIT_MAX_REQUESTS') ?? '100';

        const windowMs = Number(windowMsRaw);
        const limit = Number(limitRaw);

        const ttlSeconds = Number.isFinite(windowMs) ? Math.max(1, Math.floor(windowMs / 1000)) : 900;
        const limitRequests = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 100;

        return [
          {
            ttl: ttlSeconds,
            limit: limitRequests,
          },
        ];
      },
    }),
    HealthModule,
    AuthModule,
    HospitalsModule,
    PatientsModule,
    ConsentModule,
    DataRequestModule,
    AuditModule,
    NotificationsModule,
    DefenseModule,
  ],
  controllers: [],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
