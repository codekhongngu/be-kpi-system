import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { AnalyticsKpiQueryDto } from './dto/analytics-kpi-query.dto';
import { PivotRequestDto } from './dto/pivot-request.dto';
import { SummaryAnalyticsAnalyticsService } from './summary-analytics-analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SummaryAnalyticsAnalyticsController {
  constructor(
    private readonly analyticsService: SummaryAnalyticsAnalyticsService,
  ) {}

  @Get('kpis')
  @Permissions('analytics.read')
  async kpis(@CurrentUser() user: User, @Query() query: AnalyticsKpiQueryDto) {
    return await this.analyticsService.kpis(
      user,
      query.from,
      query.to,
      query.orgId,
    );
  }

  @Get('charts')
  @Permissions('analytics.read')
  async charts() {
    return await this.analyticsService.charts();
  }

  @Post('pivot')
  @Permissions('analytics.read')
  async pivot(@Body() dto: PivotRequestDto) {
    return await this.analyticsService.pivot(dto);
  }

  @Get('export')
  @Permissions('analytics.export')
  async export(@Query('format') format = 'excel') {
    return await this.analyticsService.export(format);
  }
}
