import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import {
  ChangePatientPasswordDto,
  ConfirmPatientPasswordResetDto,
  PatientLoginDto,
  PatientRefreshDto,
  PatientSignupDto,
  RequestPatientPasswordResetDto,
  UpdatePatientProfileDto,
} from '../auth/dto/patient-auth.dto';
import { PatientJwtAuthGuard } from '../auth/guards/patient-jwt-auth.guard';

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post('signup')
  async signup(@Body() dto: PatientSignupDto) {
    return this.patientsService.signup(dto);
  }

  @Post('login')
  async login(@Body() dto: PatientLoginDto) {
    return this.patientsService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: PatientRefreshDto) {
    return this.patientsService.refresh(dto);
  }

  @Post('logout')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async logout(@Request() req: any) {
    await this.patientsService.logout(req.user.patientId, req.headers.authorization?.replace('Bearer ', ''));
    return;
  }

  @Get('profile')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  async getProfile(@Request() req: any) {
    return this.patientsService.getPatientProfile(req.user.patientId);
  }

  @Put('profile')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  async updateProfile(@Request() req: any, @Body() dto: UpdatePatientProfileDto) {
    return this.patientsService.updatePatientProfile(req.user.patientId, dto);
  }

  @Put('password')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async changePassword(@Request() req: any, @Body() dto: ChangePatientPasswordDto) {
    await this.patientsService.changePassword(req.user.patientId, dto);
    return;
  }

  @Post('password-reset/request')
  @HttpCode(202)
  async requestPasswordReset(@Body() dto: RequestPatientPasswordResetDto) {
    await this.patientsService.requestPasswordReset(dto);
    return {
      message: 'If an account exists for this email, reset instructions have been sent.',
    };
  }

  @Post('password-reset/confirm')
  @HttpCode(204)
  async confirmPasswordReset(@Body() dto: ConfirmPatientPasswordResetDto) {
    await this.patientsService.confirmPasswordReset(dto);
    return;
  }

  @Post('sessions/logout-all')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async logoutAll(@Request() req: any) {
    await this.patientsService.logoutAll(req.user.patientId);
    return;
  }

  @Get('sessions')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  async listSessions(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.patientsService.listSessions(req.user.patientId, token);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async revokeSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    await this.patientsService.revokeSession(req.user.patientId, sessionId);
    return;
  }

  @Delete('account')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async deleteAccount(@Request() req: any) {
    await this.patientsService.deleteAccount(req.user.patientId);
    return;
  }
}
