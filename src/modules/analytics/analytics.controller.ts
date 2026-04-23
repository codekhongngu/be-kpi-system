import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { QldlPermission, QldlRbacGuard } from '../../common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsKpiQueryDto } from './dto/analytics-kpi-query.dto';
import { PivotRequestDto } from './dto/pivot-request.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  @QldlPermission('ANALYTICS', 'READ')
  async kpis(
    @CurrentUser() user: User,
    @Query() query: AnalyticsKpiQueryDto,
  ) {
    return await this.analyticsService.kpis(user, query.from, query.to, query.orgId);
  }

  @Get('charts')
  @QldlPermission('ANALYTICS', 'READ')
  async charts() {
    return await this.analyticsService.charts();
  }

  @Post('pivot')
  @QldlPermission('ANALYTICS', 'READ')
  async pivot(@Body() dto: PivotRequestDto) {
    return await this.analyticsService.pivot(dto);
  }

  @Get('export')
  @QldlPermission('ANALYTICS', 'EXPORT')
  async export(@Query('format') format = 'excel') {
    return await this.analyticsService.export(format);
  }
}
