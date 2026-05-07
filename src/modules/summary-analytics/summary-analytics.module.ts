import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';
import { ReportSummary } from './entities/report-summary.entity';
import { SummaryAnalyticsSummaryController } from './summary-analytics-summary.controller';
import { SummaryAnalyticsAnalyticsController } from './summary-analytics-analytics.controller';
import { SummaryAnalyticsQueryController } from './summary-analytics-query.controller';
import { SummaryAnalyticsSummaryService } from './summary-analytics-summary.service';
import { SummaryAnalyticsAnalyticsService } from './summary-analytics-analytics.service';
import { SummaryAnalyticsQueryService } from './summary-analytics-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportSummary,
      FormAssignment,
      ReportSubmission,
      Role,
      Permission,
    ]),
  ],
  controllers: [
    SummaryAnalyticsSummaryController,
    SummaryAnalyticsAnalyticsController,
    SummaryAnalyticsQueryController,
  ],
  providers: [
    SummaryAnalyticsSummaryService,
    SummaryAnalyticsAnalyticsService,
    SummaryAnalyticsQueryService,
  ],
})
export class SummaryAnalyticsModule {}
