import { Controller, Post, Get, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientSignupDto, PatientLoginDto, PatientRefreshDto } from '../auth/dto/patient-auth.dto';
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
}
