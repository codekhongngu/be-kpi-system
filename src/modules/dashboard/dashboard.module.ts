import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { ReportSummary } from '../summary/entities/report-summary.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ReportPeriod } from '../report-period/entities/report-period.entity';
import { User } from '../user/entities/user.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormAssignment,
      ReportSubmission,
      ReportSummary,
      Organization,
      ReportPeriod,
      User,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
