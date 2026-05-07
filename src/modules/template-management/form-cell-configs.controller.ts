import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { TemplateManagementService } from './form-designer.service';
import { UpsertFormCellConfigsDto } from './dto/upsert-form-cell-configs.dto';
import { DeleteFormCellConfigsDto } from './dto/delete-form-cell-configs.dto';

@Controller('forms/:formId/cell-configs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormCellConfigsController {
  constructor(private readonly formDesigner: TemplateManagementService) {}

  @Get()
  @Permissions('forms.manage')
  async list(@Param('formId', ParseUUIDPipe) formId: string) {
    return await this.formDesigner.listCellConfigs(formId);
  }

  @Get('effective')
  @Permissions('forms.manage')
  async listEffective(@Param('formId', ParseUUIDPipe) formId: string) {
    return await this.formDesigner.listEffectiveCellConfigs(formId);
  }

  @Post()
  @Permissions('forms.manage')
  async upsert(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: UpsertFormCellConfigsDto,
  ) {
    return await this.formDesigner.upsertCellConfigs(formId, dto);
  }

  @Delete()
  @Permissions('forms.manage')
  async remove(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: DeleteFormCellConfigsDto,
  ) {
    return await this.formDesigner.deleteCellConfigs(formId, dto);
  }
}





