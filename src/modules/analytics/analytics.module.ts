import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormAssignment,
      ReportSubmission,
      RoleGroup,
      UserRoleGroup,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, QldlRbacGuard],
})
export class AnalyticsModule {}
