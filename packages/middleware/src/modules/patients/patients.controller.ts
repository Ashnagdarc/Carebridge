import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Request, Response, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
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

  private setAuthCookies(res: ExpressResponse, accessToken: string, refreshToken: string) {
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    const common = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    // Access token cookie (short-lived)
    const accessMaxAgeSeconds = Number(process.env.JWT_EXPIRATION || '86400');
    res.cookie('carebridge_access_token', accessToken, {
      ...common,
      maxAge: Math.max(1, accessMaxAgeSeconds) * 1000,
    });

    // Refresh token cookie (long-lived)
    const refreshMaxAgeSeconds = Number(process.env.JWT_REFRESH_EXPIRATION || '2592000');
    res.cookie('carebridge_refresh_token', refreshToken, {
      ...common,
      maxAge: Math.max(1, refreshMaxAgeSeconds) * 1000,
    });
  }

  private clearAuthCookies(res: ExpressResponse) {
    res.clearCookie('carebridge_access_token', { path: '/' });
    res.clearCookie('carebridge_refresh_token', { path: '/' });
  }

  @Post('signup')
  async signup(@Body() dto: PatientSignupDto, @Response({ passthrough: true }) res: ExpressResponse) {
    const result = await this.patientsService.signup(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken || '');
    // Do not return tokens to the browser; cookies carry auth.
    return {
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      patient: result.patient,
    };
  }

  @Post('login')
  async login(@Body() dto: PatientLoginDto, @Response({ passthrough: true }) res: ExpressResponse) {
    const result = await this.patientsService.login(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken || '');
    return {
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      patient: result.patient,
    };
  }

  @Post('refresh')
  async refresh(
    @Request() req: any,
    @Body() dto: PatientRefreshDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = dto.refreshToken || req.cookies?.carebridge_refresh_token;
    const result = await this.patientsService.refresh({ refreshToken });
    this.setAuthCookies(res, result.accessToken, result.refreshToken || '');
    return {
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      patient: result.patient,
    };
  }

  @Post('logout')
  @UseGuards(PatientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async logout(@Request() req: any, @Response({ passthrough: true }) res: ExpressResponse) {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const cookieToken = req.cookies?.carebridge_access_token;
    const token = headerToken || cookieToken || '';
    if (token) {
      await this.patientsService.logout(req.user.patientId, token);
    }
    this.clearAuthCookies(res);
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
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.carebridge_access_token;
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
