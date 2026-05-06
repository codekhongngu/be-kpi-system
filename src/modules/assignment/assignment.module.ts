import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from './entities/form-assignment.entity';
import { AssignmentBatch } from './entities/assignment-batch.entity';
import { AssignmentIndicatorScope } from './entities/assignment-indicator-scope.entity';
import { Form } from '../form-designer/entities/form.entity';
import { FormIndicator } from '../form-designer/entities/form-indicator.entity';
import { Organization } from '../organization/entities/organization.entity';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormAssignment,
      AssignmentBatch,
      AssignmentIndicatorScope,
      Form,
      FormIndicator,
      Organization,
      Role,
      Permission,
    ]),
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
