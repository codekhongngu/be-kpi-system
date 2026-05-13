import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { FormAttribute } from './entities/form-attribute.entity';
import { FormIndicator } from './entities/form-indicator.entity';
import { FormCellConfig } from './entities/form-cell-config.entity';
import { FieldCategory } from './entities/field-category.entity';
import { IndicatorCatalog } from './entities/indicator-catalog.entity';
import { TemplateManagementService } from './form-designer.service';
import { FormsController } from './forms.controller';
import { FormAttributesController } from './form-attributes.controller';
import { FormIndicatorsController } from './form-indicators.controller';
import { IndicatorCatalogController } from './indicator-catalog.controller';
import { FieldCategoriesController } from './field-categories.controller';
import { FormCellConfigsController } from './form-cell-configs.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';
import { FormTemplateIndicatorOrgRule } from './entities/form-template-indicator-org-rule.entity';
import { TemplateScopeController } from './template-scope.controller';
import { ImportController } from './import.controller';
import { AssignmentBatch } from '../report-campaign/assignment/entities/assignment-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormAttribute,
      FormIndicator,
      FormCellConfig,
      FieldCategory,
      IndicatorCatalog,
      FormTemplateIndicatorOrgRule,
      AssignmentBatch,
      Role,
      Permission,
    ]),
  ],
  controllers: [
    FormsController,
    FormAttributesController,
    FormIndicatorsController,
    FormCellConfigsController,
    IndicatorCatalogController,
    FieldCategoriesController,
    TemplateScopeController,
    ImportController,
  ],
  providers: [TemplateManagementService],
  exports: [TemplateManagementService],
})
export class TemplateManagementModule {}




