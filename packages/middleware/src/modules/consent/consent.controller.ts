import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ConsentService } from './consent.service';
import {
  CreateConsentRequestDto,
  ApproveConsentRequestDto,
  DenyConsentRequestDto,
  RevokeConsentDto,
} from './dto/consent.dto';
import { HospitalJwtAuthGuard } from '../auth/guards/hospital-jwt-auth.guard';
import { PatientJwtAuthGuard } from '../auth/guards/patient-jwt-auth.guard';

@Controller('consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  /**
   * Hospital initiates a consent request
   * POST /consent/requests
   */
  @Post('requests')
  @UseGuards(HospitalJwtAuthGuard)
  async createConsentRequest(
    @Body() dto: CreateConsentRequestDto,
    @Request() req: any,
  ) {
    // Ensure hospital is creating request for itself
    if (dto.requestingHospitalId !== req.user.hospitalId) {
      throw new BadRequestException(
        'Hospital can only create consent requests for itself',
      );
    }
    return this.consentService.createConsentRequest(dto);
  }

  /**
   * Patient approves a consent request
   * POST /consent/requests/:id/approve
   */
  @Post('requests/:id/approve')
  @UseGuards(PatientJwtAuthGuard)
  async approveConsentRequest(
    @Param('id') id: string,
    @Body() dto: ApproveConsentRequestDto,
    @Request() req: any,
  ) {
    // Verify patient owns this request
    const request = await this.consentService['prisma'].consentRequest.findUnique({
      where: { id },
    });

    if (!request || request.patientId !== req.user.patientId) {
      throw new BadRequestException('Consent request not found for this patient');
    }

    return this.consentService.approveConsentRequest(id, dto);
  }

  /**
   * Patient denies a consent request
   * POST /consent/requests/:id/deny
   */
  @Post('requests/:id/deny')
  @UseGuards(PatientJwtAuthGuard)
  async denyConsentRequest(
    @Param('id') id: string,
    @Body() dto: DenyConsentRequestDto,
    @Request() req: any,
  ) {
    // Verify patient owns this request
    const request = await this.consentService['prisma'].consentRequest.findUnique({
      where: { id },
    });

    if (!request || request.patientId !== req.user.patientId) {
      throw new BadRequestException('Consent request not found for this patient');
    }

    return this.consentService.denyConsentRequest(id, dto);
  }

  /**
   * Patient revokes an active consent
   * DELETE /consent/records/:id
   */
  @Delete('records/:id')
  @UseGuards(PatientJwtAuthGuard)
  async revokeConsent(
    @Param('id') id: string,
    @Body() dto: RevokeConsentDto,
    @Request() req: any,
  ) {
    return this.consentService.revokeConsent(id, req.user.patientId, dto);
  }

  /**
   * Patient lists pending consent requests
   * GET /consent/requests/pending
   */
  @Get('requests/pending')
  @UseGuards(PatientJwtAuthGuard)
  async listPendingRequests(@Request() req: any) {
    return this.consentService.listPendingConsentRequests(req.user.patientId);
  }

  /**
   * Patient lists active consents
   * GET /consent/records
   */
  @Get('records')
  @UseGuards(PatientJwtAuthGuard)
  async listActiveConsents(@Request() req: any) {
    return this.consentService.listActiveConsents(req.user.patientId);
  }

  /**
   * Hospital gets consent records for a patient
   * GET /consent/records/:patientId
   */
  @Get('records/:patientId')
  @UseGuards(HospitalJwtAuthGuard)
  async getConsentRecords(
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    return this.consentService.getConsentRecordsForHospital(
      patientId,
      req.user.hospitalId,
    );
  }
}
