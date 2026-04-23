import {
  Body,
  Controller,
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
import { Permissions, PermissionsGuard } from '../../common';
import { FormDesignerService } from './form-designer.service';
import { FieldCategoryQueryDto } from './dto/field-category-query.dto';
import { CreateFieldCategoryDto } from './dto/create-field-category.dto';
import { PatchFieldCategoryDto } from './dto/patch-field-category.dto';

@Controller('field-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FieldCategoriesController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @Permissions('forms.manage')
  async list(@Query() query: FieldCategoryQueryDto) {
    return await this.formDesigner.findAllFieldCategories(query);
  }

  @Post()
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFieldCategoryDto) {
    return await this.formDesigner.createFieldCategory(dto);
  }

  @Patch(':id')
  @Permissions('forms.manage')
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchFieldCategoryDto,
  ) {
    return await this.formDesigner.patchFieldCategory(id, dto);
  }
}
