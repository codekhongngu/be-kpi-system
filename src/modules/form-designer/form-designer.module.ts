import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { FormAttribute } from './entities/form-attribute.entity';
import { FormIndicator } from './entities/form-indicator.entity';
import { IndicatorCatalog } from './entities/indicator-catalog.entity';
import { ImportJob } from '../user/entities/import-job.entity';
import { FormDesignerService } from './form-designer.service';
import { FormsController } from './forms.controller';
import { FormAttributesController } from './form-attributes.controller';
import { FormIndicatorsController } from './form-indicators.controller';
import { IndicatorCatalogController } from './indicator-catalog.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormAttribute,
      FormIndicator,
      IndicatorCatalog,
      ImportJob,
    ]),
  ],
  controllers: [
    FormsController,
    FormAttributesController,
    FormIndicatorsController,
    IndicatorCatalogController,
  ],
  providers: [FormDesignerService, QldlRbacGuard],
  exports: [FormDesignerService],
})
export class FormDesignerModule {}
