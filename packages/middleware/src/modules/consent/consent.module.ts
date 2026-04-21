import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { PrismaService } from '@src/common/prisma/prisma.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [PassportModule, NotificationsModule],
  providers: [ConsentService, PrismaService],
  controllers: [ConsentController],
  exports: [ConsentService],
})
export class ConsentModule {}
