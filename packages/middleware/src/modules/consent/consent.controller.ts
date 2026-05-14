// CareBridge: Consent workflow logic and API wiring.
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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import {
  CreateConsentRequestDto,
  ApproveConsentRequestDto,
  DenyConsentRequestDto,
  RevokeConsentDto,
} from './dto/consent.dto';
import { HospitalJwtAuthGuard } from '../auth/guards/hospital-jwt-auth.guard';
import { PatientJwtAuthGuard } from '../auth/guards/patient-jwt-auth.guard';

@ApiTags('consent')
@Controller('consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  /**
   * Hospital initiates a consent request
   * POST /consent/requests
   */
  @Post('requests')
  @UseGuards(HospitalJwtAuthGuard)
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  async approveConsentRequest(
    @Param('id') id: string,
    @Body() dto: ApproveConsentRequestDto,
    @Request() req: any,
  ) {
    await this.consentService.assertConsentRequestBelongsToPatient(id, req.user.patientId);
    return this.consentService.approveConsentRequest(id, dto);
  }

  /**
   * Patient denies a consent request
   * POST /consent/requests/:id/deny
   */
  @Post('requests/:id/deny')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  async denyConsentRequest(
    @Param('id') id: string,
    @Body() dto: DenyConsentRequestDto,
    @Request() req: any,
  ) {
    await this.consentService.assertConsentRequestBelongsToPatient(id, req.user.patientId);
    return this.consentService.denyConsentRequest(id, dto);
  }

  /**
   * Patient revokes an active consent
   * DELETE /consent/records/:id
   */
  @Delete('records/:id')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  async listPendingRequests(@Request() req: any) {
    return this.consentService.listPendingConsentRequests(req.user.patientId);
  }

  /**
   * Patient lists active consents
   * GET /consent/records
   */
  @Get('records')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  async listActiveConsents(@Request() req: any) {
    return this.consentService.listActiveConsents(req.user.patientId);
  }

  /**
   * Hospital gets consent records for a patient
   * GET /consent/records/:patientId
   */
  @Get('records/:patientId')
  @UseGuards(HospitalJwtAuthGuard)
  @ApiBearerAuth()
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
