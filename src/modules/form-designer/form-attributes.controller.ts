import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { FormDesignerService } from './form-designer.service';
import { CreateFormAttributeDto } from './dto/create-form-attribute.dto';
import { PatchFormAttributeDto } from './dto/patch-form-attribute.dto';
import { ReorderAttributesDto } from './dto/reorder-attributes.dto';

@Controller('forms/:formId/attributes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormAttributesController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @Permissions('forms.manage')
  async list(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query('parentId') parentId?: string,
  ) {
    return await this.formDesigner.listAttributes(formId, parentId);
  }

  @Post('reorder')
  @Permissions('forms.manage')
  async reorder(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: ReorderAttributesDto,
  ) {
    return await this.formDesigner.reorderAttributes(formId, dto.orderedIds);
  }

  @Post()
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: CreateFormAttributeDto,
  ) {
    return await this.formDesigner.createAttribute(formId, dto);
  }

  @Patch(':attrId')
  @Permissions('forms.manage')
  async patch(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('attrId', ParseUUIDPipe) attrId: string,
    @Body() dto: PatchFormAttributeDto,
  ) {
    return await this.formDesigner.patchAttribute(formId, attrId, dto);
  }

  @Delete(':attrId')
  @Permissions('forms.manage')
  async remove(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('attrId', ParseUUIDPipe) attrId: string,
  ) {
    return await this.formDesigner.removeAttribute(formId, attrId);
  }

  @Post('import')
  @Permissions('forms.manage')
  async importJob(
    @Param('formId', ParseUUIDPipe) _formId: string,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.enqueueAttributesImport(user?.id);
  }
}
