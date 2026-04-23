import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { FormAttribute } from './entities/form-attribute.entity';
import { FormIndicator } from './entities/form-indicator.entity';
import { FieldCategory } from './entities/field-category.entity';
import { IndicatorCatalog } from './entities/indicator-catalog.entity';
import { ImportJob } from '../user/entities/import-job.entity';
import { FormDesignerService } from './form-designer.service';
import { FormsController } from './forms.controller';
import { FormAttributesController } from './form-attributes.controller';
import { FormIndicatorsController } from './form-indicators.controller';
import { IndicatorCatalogController } from './indicator-catalog.controller';
import { FieldCategoriesController } from './field-categories.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormAttribute,
      FormIndicator,
      FieldCategory,
      IndicatorCatalog,
      ImportJob,
      Role,
      Permission,
    ]),
  ],
  controllers: [
    FormsController,
    FormAttributesController,
    FormIndicatorsController,
    IndicatorCatalogController,
    FieldCategoriesController,
  ],
  providers: [FormDesignerService],
  exports: [FormDesignerService],
})
export class FormDesignerModule {}
