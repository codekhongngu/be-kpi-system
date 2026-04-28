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
import { CreateFormIndicatorDto } from './dto/create-form-indicator.dto';
import { PatchFormIndicatorDto } from './dto/patch-form-indicator.dto';
import { ReorderIndicatorsDto } from './dto/reorder-indicators.dto';

@Controller('forms/:formId/indicators')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormIndicatorsController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @Permissions('forms.manage')
  async list(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query('parentId') parentId?: string,
  ) {
    return await this.formDesigner.listIndicators(formId, parentId);
  }

  @Post()
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: CreateFormIndicatorDto,
  ) {
    return await this.formDesigner.createIndicator(formId, dto);
  }

  @Patch(':indicatorId')
  @Permissions('forms.manage')
  async patch(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('indicatorId', ParseUUIDPipe) indicatorId: string,
    @Body() dto: PatchFormIndicatorDto,
  ) {
    return await this.formDesigner.patchIndicator(formId, indicatorId, dto);
  }

  @Delete(':indicatorId')
  @Permissions('forms.manage')
  async remove(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('indicatorId', ParseUUIDPipe) indicatorId: string,
  ) {
    return await this.formDesigner.removeIndicator(formId, indicatorId);
  }

  @Post('reorder')
  @Permissions('forms.manage')
  async reorder(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: ReorderIndicatorsDto,
  ) {
    return await this.formDesigner.reorderIndicators(formId, dto.orderedIds);
  }

  @Post('import')
  @Permissions('forms.manage')
  async importJob(
    @Param('formId', ParseUUIDPipe) _formId: string,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.enqueueIndicatorsImport(user?.id);
  }
}
