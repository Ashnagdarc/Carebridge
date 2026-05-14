// CareBridge: Defense demo orchestration and live event streaming.
import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { DataRequestModule } from '@modules/data-request/data-request.module';
import { ConsentModule } from '@modules/consent/consent.module';
import { DefenseGateway } from './defense.gateway';
import { DefenseService } from './defense.service';
import { DefenseController } from './defense.controller';

@Module({
  imports: [forwardRef(() => DataRequestModule), forwardRef(() => ConsentModule)],
  providers: [DefenseGateway, DefenseService, PrismaService],
  controllers: [DefenseController],
  exports: [DefenseService],
})
export class DefenseModule {}
