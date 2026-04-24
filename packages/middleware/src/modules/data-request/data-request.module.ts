import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DataRequestService } from './data-request.service';
import { DataRequestController } from './data-request.controller';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { ConsentModule } from '../consent/consent.module';
import { AuditModule } from '../audit/audit.module';
import { DefenseModule } from '../defense/defense.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => ConsentModule),
    AuditModule,
    forwardRef(() => DefenseModule),
  ],
  providers: [DataRequestService, PrismaService],
  controllers: [DataRequestController],
  exports: [DataRequestService],
})
export class DataRequestModule {}
