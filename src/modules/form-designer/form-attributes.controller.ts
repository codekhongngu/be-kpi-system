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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { QldlPermission, QldlRbacGuard } from '../../common';
import { FormDesignerService } from './form-designer.service';
import { CreateFormAttributeDto } from './dto/create-form-attribute.dto';
import { PatchFormAttributeDto } from './dto/patch-form-attribute.dto';

@Controller('forms/:formId/attributes')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class FormAttributesController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @QldlPermission('DESIGN_FORMS', 'READ')
  async list(@Param('formId', ParseUUIDPipe) formId: string) {
    return await this.formDesigner.listAttributes(formId);
  }

  @Post()
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: CreateFormAttributeDto,
  ) {
    return await this.formDesigner.createAttribute(formId, dto);
  }

  @Patch(':attrId')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async patch(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('attrId', ParseUUIDPipe) attrId: string,
    @Body() dto: PatchFormAttributeDto,
  ) {
    return await this.formDesigner.patchAttribute(formId, attrId, dto);
  }

  @Delete(':attrId')
  @QldlPermission('DESIGN_FORMS', 'DELETE')
  async remove(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('attrId', ParseUUIDPipe) attrId: string,
  ) {
    return await this.formDesigner.removeAttribute(formId, attrId);
  }

  @Post('import')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async importJob(
    @Param('formId', ParseUUIDPipe) _formId: string,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.enqueueAttributesImport(user?.id);
  }
}
