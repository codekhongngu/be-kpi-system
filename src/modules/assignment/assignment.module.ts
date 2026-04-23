import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from './entities/form-assignment.entity';
import { Form } from '../form-designer/entities/form.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ReportPeriod } from '../report-period/entities/report-period.entity';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormAssignment, Form, Organization, ReportPeriod]),
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService, QldlRbacGuard],
  exports: [AssignmentService],
})
export class AssignmentModule {}
