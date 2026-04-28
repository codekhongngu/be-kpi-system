import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Permissions('dashboard.read')
  async getOverview(@Query() query: DashboardQueryDto) {
    return await this.dashboardService.getOverview(query);
  }

  @Get('trends')
  @Permissions('dashboard.read')
  async getSubmissionTrends(@Query() query: DashboardQueryDto) {
    return await this.dashboardService.getSubmissionTrends(query);
  }
}
