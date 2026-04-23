import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { Notification } from '../notification/entities/notification.entity';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportSubmission,
      FormAssignment,
      Notification,
      RoleGroup,
      UserRoleGroup,
    ]),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService, QldlRbacGuard],
})
export class ApprovalModule {}
