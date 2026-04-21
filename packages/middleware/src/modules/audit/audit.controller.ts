import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/audit.dto';
import { HospitalJwtAuthGuard } from '../auth/guards/hospital-jwt-auth.guard';
import { PatientJwtAuthGuard } from '../auth/guards/patient-jwt-auth.guard';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * List all audit logs (admin endpoint - for now accessible to any authenticated user)
   * GET /audit/logs
   */
  @Get('logs')
  @UseGuards(HospitalJwtAuthGuard)
  async listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    // Parse pagination
    const skip = query.skip ? parseInt(query.skip.toString()) : 0;
    const take = query.take ? parseInt(query.take.toString()) : 50;

    if (take > 500) {
      throw new BadRequestException('Maximum take limit is 500');
    }

    return this.auditService.listAuditLogs({
      ...query,
      skip,
      take,
    });
  }

  /**
   * Get audit log by ID
   * GET /audit/logs/:id
   */
  @Get('logs/:id')
  @UseGuards(HospitalJwtAuthGuard)
  async getAuditLog(@Param('id') id: string) {
    return this.auditService.getAuditLogById(id);
  }

  /**
   * Get audit logs for a specific patient (patient viewing own logs)
   * GET /audit/patient-logs
   */
  @Get('patient-logs')
  @UseGuards(PatientJwtAuthGuard)
  async getPatientAuditLogs(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    if (takeNum > 500) {
      throw new BadRequestException('Maximum take limit is 500');
    }

    return this.auditService.getPatientAuditLogs(
      req.user.patientId,
      skipNum,
      takeNum,
    );
  }

  /**
   * Get audit logs for a specific hospital (hospital viewing own logs)
   * GET /audit/hospital-logs
   */
  @Get('hospital-logs')
  @UseGuards(HospitalJwtAuthGuard)
  async getHospitalAuditLogs(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    if (takeNum > 500) {
      throw new BadRequestException('Maximum take limit is 500');
    }

    return this.auditService.getHospitalAuditLogs(
      req.user.hospitalId,
      skipNum,
      takeNum,
    );
  }

  /**
   * Get audit summary for recent activity
   * GET /audit/summary
   */
  @Get('summary')
  @UseGuards(HospitalJwtAuthGuard)
  async getAuditSummary(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;

    if (daysNum < 1 || daysNum > 365) {
      throw new BadRequestException('Days must be between 1 and 365');
    }

    return this.auditService.getAuditSummary(daysNum);
  }
}
