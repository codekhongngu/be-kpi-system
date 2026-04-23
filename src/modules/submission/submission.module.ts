import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSubmission } from './entities/report-submission.entity';
import { ReportData } from './entities/report-data.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { FormIndicator } from '../form-designer/entities/form-indicator.entity';
import { FormAttribute } from '../form-designer/entities/form-attribute.entity';
import { Notification } from '../notification/entities/notification.entity';
import { SubmissionService } from './submission.service';
import { SubmissionsController } from './submissions.controller';
import { MyAssignmentsController } from './my-assignments.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportSubmission,
      ReportData,
      FormAssignment,
      FormIndicator,
      FormAttribute,
      Notification,
      Role,
      Permission,
    ]),
  ],
  controllers: [SubmissionsController, MyAssignmentsController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
