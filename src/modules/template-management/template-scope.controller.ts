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
import { UpsertTemplateScopesDto } from './dto/upsert-template-scope.dto';

@Controller('forms/:formId/template-scopes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplateScopeController {
  constructor(private readonly formDesignerService: TemplateManagementService) {}

  @Get()
  @Permissions('forms.manage')
  async list(@Param('formId', ParseUUIDPipe) formId: string) {
    return await this.formDesignerService.listTemplateScopes(formId);
  }

  @Post()
  @Permissions('forms.manage')
  async upsert(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: UpsertTemplateScopesDto,
  ) {
    return await this.formDesignerService.upsertTemplateScopes(formId, dto);
  }

  @Delete()
  @Permissions('forms.manage')
  async delete(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: UpsertTemplateScopesDto,
  ) {
    return await this.formDesignerService.deleteTemplateScopes(formId, dto);
  }
}





