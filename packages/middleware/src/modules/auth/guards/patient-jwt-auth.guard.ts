// CareBridge: Auth guard logic that protects route access.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PatientJwtAuthGuard extends AuthGuard('patient-jwt') {}
