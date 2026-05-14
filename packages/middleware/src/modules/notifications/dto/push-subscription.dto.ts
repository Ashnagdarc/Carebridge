// CareBridge: Type-safe DTO contracts used for request/response validation.
import { IsObject, IsOptional, IsString } from 'class-validator';

export class PushSubscriptionDto {
  @IsString()
  endpoint!: string;

  @IsObject()
  keys!: {
    p256dh: string;
    auth: string;
  };

  @IsOptional()
  @IsString()
  expirationTime?: string | null;
}

