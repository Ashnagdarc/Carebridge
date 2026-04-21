import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { HospitalRegisterDto, HospitalLoginDto } from '../auth/dto/hospital-auth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  @Post('register')
  async register(@Body() dto: HospitalRegisterDto) {
    return this.hospitalsService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: HospitalLoginDto) {
    return this.hospitalsService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.hospitalsService.getHospitalById(req.user.hospitalId);
  }
}
