import { Body, Controller, Delete, Get, HttpCode, Post, Put, Request, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import {
  ChangePatientPasswordDto,
  PatientLoginDto,
  PatientRefreshDto,
  PatientSignupDto,
  UpdatePatientProfileDto,
} from '../auth/dto/patient-auth.dto';
import { PatientJwtAuthGuard } from '../auth/guards/patient-jwt-auth.guard';

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
  @HttpCode(204)
  async logout(@Request() req: any) {
    await this.patientsService.logout(req.user.patientId, req.headers.authorization?.replace('Bearer ', ''));
    return;
  }

  @Get('profile')
  @UseGuards(PatientJwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.patientsService.getPatientProfile(req.user.patientId);
  }

  @Put('profile')
  @UseGuards(PatientJwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() dto: UpdatePatientProfileDto) {
    return this.patientsService.updatePatientProfile(req.user.patientId, dto);
  }

  @Put('password')
  @UseGuards(PatientJwtAuthGuard)
  @HttpCode(204)
  async changePassword(@Request() req: any, @Body() dto: ChangePatientPasswordDto) {
    await this.patientsService.changePassword(req.user.patientId, dto);
    return;
  }

  @Post('sessions/logout-all')
  @UseGuards(PatientJwtAuthGuard)
  @HttpCode(204)
  async logoutAll(@Request() req: any) {
    await this.patientsService.logoutAll(req.user.patientId);
    return;
  }

  @Delete('account')
  @UseGuards(PatientJwtAuthGuard)
  @HttpCode(204)
  async deleteAccount(@Request() req: any) {
    await this.patientsService.deleteAccount(req.user.patientId);
    return;
  }
}
