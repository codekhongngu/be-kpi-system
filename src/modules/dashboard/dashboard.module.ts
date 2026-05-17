import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldCategory } from '../template-management/entities/field-category.entity';
import { Form } from '../template-management/entities/form.entity';
import { FormIndicator } from '../template-management/entities/form-indicator.entity';
import { FormAttribute } from '../template-management/entities/form-attribute.entity';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FieldCategory,
      Form,
      FormIndicator,
      FormAttribute,
      FormAssignment,
      Role,
      Permission,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
