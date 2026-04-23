import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormAssignment,
      ReportSubmission,
      Role,
      Permission,
    ]),
  ],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
