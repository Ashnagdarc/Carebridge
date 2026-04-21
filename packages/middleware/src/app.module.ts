import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConsentModule } from './modules/consent/consent.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { DataRequestModule } from './modules/data-request/data-request.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaService } from './common/prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HealthModule,
    AuthModule,
    HospitalsModule,
    PatientsModule,
    ConsentModule,
    DataRequestModule,
    AuditModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
