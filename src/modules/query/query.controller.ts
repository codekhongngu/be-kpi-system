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
import { QldlPermission, QldlRbacGuard } from '../../common';
import { QueryService } from './query.service';
import { QueryReportsDto } from './dto/query-reports.dto';

@Controller('query')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Get('reports')
  @QldlPermission('QUERY_REPORTS', 'READ')
  async reports(@CurrentUser() user: User, @Query() query: QueryReportsDto) {
    return await this.queryService.listReports(user, query);
  }

  @Get('reports/:submissionId')
  @QldlPermission('QUERY_REPORTS', 'READ')
  async detail(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: User,
  ) {
    return await this.queryService.reportDetail(submissionId, user);
  }

  @Get('reports/:submissionId/export')
  @QldlPermission('QUERY_REPORTS', 'EXPORT')
  async export(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Query('format') format = 'excel',
  ) {
    return await this.queryService.exportReport(submissionId, format);
  }
}
