import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { Notification } from '../notification/entities/notification.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ReportSubmission, FormAssignment, Notification])],
  controllers: [ApprovalController],
  providers: [ApprovalService, QldlRbacGuard],
})
export class ApprovalModule {}
