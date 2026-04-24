import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DefenseService } from './defense.service';

@Controller('defense')
export class DefenseController {
  constructor(private readonly defenseService: DefenseService) {}

  @Get('patients')
  async listPatients(@Query('token') token?: string) {
    return this.defenseService.listPatients(token);
  }

  @Get('resolve-patient')
  async resolvePatient(
    @Query('token') token?: string,
    @Query('patientRef') patientRef?: string,
  ) {
    return this.defenseService.resolvePatient(token, patientRef);
  }

  @Post('start')
  async startDemoFlow(
    @Query('token') token?: string,
    @Body()
    body?: {
      patientId?: string;
      patientRef?: string;
      targetHospitalId?: string;
      purpose?: string;
      dataTypes?: string[];
      autoApprove?: boolean;
      forceConsent?: boolean;
    },
  ) {
    return this.defenseService.startDemoFlow(token, body);
  }

  @Post('approve-consent')
  async approveConsent(
    @Query('token') token?: string,
    @Body()
    body?: {
      dataRequestId?: string;
      consentRequestId?: string;
    },
  ) {
    return this.defenseService.approveConsent(token, body);
  }
}
