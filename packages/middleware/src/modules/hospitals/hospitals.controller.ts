// CareBridge: Hospital identity and integration endpoint management.
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { HospitalRegisterDto, HospitalLoginDto } from '../auth/dto/hospital-auth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('hospitals')
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
  @ApiBearerAuth()
  async getProfile(@Request() req: any) {
    return this.hospitalsService.getHospitalById(req.user.hospitalId);
  }

  @Get()
  async getHospitals() {
    return this.hospitalsService.getHospitals();
  }
}
