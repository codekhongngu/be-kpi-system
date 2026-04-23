import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { Notification } from '../notification/entities/notification.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportSubmission,
      FormAssignment,
      Notification,
      Role,
      Permission,
    ]),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
})
export class ApprovalModule {}
