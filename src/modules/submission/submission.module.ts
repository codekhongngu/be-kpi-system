import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSubmission } from './entities/report-submission.entity';
import { ReportData } from './entities/report-data.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { FormIndicator } from '../form-designer/entities/form-indicator.entity';
import { FormAttribute } from '../form-designer/entities/form-attribute.entity';
import { Notification } from '../notification/entities/notification.entity';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { SubmissionService } from './submission.service';
import { SubmissionsController } from './submissions.controller';
import { MyAssignmentsController } from './my-assignments.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportSubmission,
      ReportData,
      FormAssignment,
      FormIndicator,
      FormAttribute,
      Notification,
      RoleGroup,
      UserRoleGroup,
    ]),
  ],
  controllers: [SubmissionsController, MyAssignmentsController],
  providers: [SubmissionService, QldlRbacGuard],
  exports: [SubmissionService],
})
export class SubmissionModule {}
