import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Headers,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PatientJwtAuthGuard } from '@modules/auth/guards/patient-jwt-auth.guard';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { PushService } from './push.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly pushService: PushService) {}

  @Post('push/subscribe')
  @UseGuards(PatientJwtAuthGuard)
  async subscribePush(
    @Body() dto: PushSubscriptionDto,
    @Request() req: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    if (!dto?.endpoint || !dto.keys?.p256dh || !dto.keys?.auth) {
      throw new BadRequestException('Invalid push subscription payload');
    }

    await this.pushService.upsertSubscription({
      patientId: req.user.patientId,
      endpoint: dto.endpoint,
      p256dh: dto.keys?.p256dh,
      auth: dto.keys?.auth,
      userAgent: userAgent || null,
    });

    return { success: true };
  }

  @Delete('push/unsubscribe')
  @UseGuards(PatientJwtAuthGuard)
  async unsubscribePush(@Body() body: { endpoint?: string }, @Request() req: any) {
    if (!body?.endpoint) return { success: true };
    await this.pushService.removeSubscription(req.user.patientId, body.endpoint);
    return { success: true };
  }
}
