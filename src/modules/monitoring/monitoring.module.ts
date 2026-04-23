import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormAssignment,
      ReportSubmission,
      Notification,
      User,
      RoleGroup,
      UserRoleGroup,
    ]),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, QldlRbacGuard],
})
export class MonitoringModule {}
