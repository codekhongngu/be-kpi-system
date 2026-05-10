import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';
import { AssignmentBatch } from '../report-campaign/assignment/entities/assignment-batch.entity';
import { AssignmentIndicatorScope } from '../report-campaign/assignment/entities/assignment-indicator-scope.entity';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { Form } from '../template-management/entities/form.entity';
import { FormIndicator } from '../template-management/entities/form-indicator.entity';
import { FormTemplateIndicatorOrgRule } from '../template-management/entities/form-template-indicator-org-rule.entity';
import { FormAttribute } from '../template-management/entities/form-attribute.entity';
import { ReportCampaignDefaultValue } from './entities/report-campaign-default-value.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ReportCampaignController } from './report-campaign.controller';
import { ReportCampaignService } from './report-campaign.service';
import { ReportAssignmentModule } from './assignment/assignment.module';

@Module({
  imports: [
    ReportAssignmentModule,
    TypeOrmModule.forFeature([
      AssignmentBatch,
      AssignmentIndicatorScope,
      FormAssignment,
      Form,
      FormAttribute,
      FormIndicator,
      FormTemplateIndicatorOrgRule,
      Organization,
      ReportCampaignDefaultValue,
      Role,
      Permission,
    ]),
  ],
  controllers: [ReportCampaignController],
  providers: [ReportCampaignService],
  exports: [ReportCampaignService],
})
export class ReportCampaignModule {}



