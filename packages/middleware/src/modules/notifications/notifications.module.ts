import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [AuthModule],
  providers: [NotificationsGateway, NotificationsService, PrismaService, PushService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
