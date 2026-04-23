import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([FormAssignment, ReportSubmission])],
  controllers: [QueryController],
  providers: [QueryService, QldlRbacGuard],
})
export class QueryModule {}
