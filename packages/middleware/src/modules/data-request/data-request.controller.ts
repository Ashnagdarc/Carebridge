// CareBridge: Hospital-to-hospital data request lifecycle handling.
import {
  Controller,
  Post,
  Get,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DataRequestService } from './data-request.service';
import { CreateDataRequestDto, ListDataRequestsQueryDto } from './dto/data-request.dto';
import { HospitalJwtAuthGuard } from '../auth/guards/hospital-jwt-auth.guard';

@ApiTags('data-requests')
@ApiBearerAuth()
@Controller('data-requests')
export class DataRequestController {
  constructor(private dataRequestService: DataRequestService) {}

  /**
   * Create a new data request
   * POST /data-requests
   * Authenticated: Hospital
   */
  @Post()
  @UseGuards(HospitalJwtAuthGuard)
  async createDataRequest(
    @Body() dto: CreateDataRequestDto,
    @Request() req: any,
  ) {
    return this.dataRequestService.createDataRequest(dto, req.user.hospitalId);
  }

  /**
   * Get data request by ID
   * GET /data-requests/:id
   * Authenticated: Hospital
   */
  @Get(':id')
  @UseGuards(HospitalJwtAuthGuard)
  async getDataRequest(@Param('id') id: string) {
    return this.dataRequestService.getDataRequestById(id);
  }

  /**
   * List all data requests (with filtering)
   * GET /data-requests
   * Authenticated: Hospital
   */
  @Get()
  @UseGuards(HospitalJwtAuthGuard)
  async listDataRequests(@Query() query: ListDataRequestsQueryDto) {
    // Parse pagination
    const skip = query.skip ? parseInt(query.skip.toString()) : 0;
    const take = query.take ? parseInt(query.take.toString()) : 50;

    if (take > 500) {
      throw new BadRequestException('Maximum take limit is 500');
    }

    return this.dataRequestService.listDataRequests({
      ...query,
      skip,
      take,
    });
  }

  /**
   * Get data requests for authenticated hospital (as source)
   * GET /data-requests/hospital/outgoing
   * Authenticated: Hospital
   */
  @Get('hospital/outgoing')
  @UseGuards(HospitalJwtAuthGuard)
  async getHospitalOutgoingRequests(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    if (takeNum > 500) {
      throw new BadRequestException('Maximum take limit is 500');
    }

    return this.dataRequestService.getHospitalDataRequests(
      req.user.hospitalId,
      skipNum,
      takeNum,
    );
  }

  /**
   * Get incoming data requests targeting hospital
   * GET /data-requests/hospital/incoming
   * Authenticated: Hospital
   */
  @Get('hospital/incoming')
  @UseGuards(HospitalJwtAuthGuard)
  async getHospitalIncomingRequests(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    if (takeNum > 500) {
      throw new BadRequestException('Maximum take limit is 500');
    }

    return this.dataRequestService.getIncomingDataRequests(
      req.user.hospitalId,
      skipNum,
      takeNum,
    );
  }

  /**
   * Get data request statistics for hospital
   * GET /data-requests/hospital/stats
   * Authenticated: Hospital
   */
  @Get('hospital/stats')
  @UseGuards(HospitalJwtAuthGuard)
  async getHospitalStats(@Request() req: any) {
    return this.dataRequestService.getDataRequestStats(req.user.hospitalId);
  }
}
