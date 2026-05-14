// CareBridge: Consent workflow logic and API wiring.
import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { DataRequestModule } from '@modules/data-request/data-request.module';
import { DefenseModule } from '@modules/defense/defense.module';

@Module({
  imports: [PassportModule, NotificationsModule, DefenseModule, forwardRef(() => DataRequestModule)],
  providers: [ConsentService, PrismaService],
  controllers: [ConsentController],
  exports: [ConsentService],
})
export class ConsentModule {}
