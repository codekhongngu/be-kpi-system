import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { QueryReportsDto } from './dto/query-reports.dto';
import { SummaryAnalyticsQueryService } from './summary-analytics-query.service';

@Controller('query')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SummaryAnalyticsQueryController {
  constructor(private readonly queryService: SummaryAnalyticsQueryService) {}

  @Get('reports')
  @Permissions('reports.read')
  async reports(@CurrentUser() user: User, @Query() query: QueryReportsDto) {
    return await this.queryService.listReports(user, query);
  }

  @Get('reports/:submissionId')
  @Permissions('reports.read')
  async detail(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: User,
  ) {
    return await this.queryService.reportDetail(submissionId, user);
  }

  @Get('reports/:submissionId/export')
  @Permissions('reports.export')
  async export(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Query('format') format = 'excel',
  ) {
    return await this.queryService.exportReport(submissionId, format);
  }
}
