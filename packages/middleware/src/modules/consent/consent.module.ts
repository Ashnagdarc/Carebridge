import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { PrismaService } from '@src/common/prisma/prisma.service';

@Module({
  imports: [PassportModule],
  providers: [ConsentService, PrismaService],
  controllers: [ConsentController],
  exports: [ConsentService],
})
export class ConsentModule {}
