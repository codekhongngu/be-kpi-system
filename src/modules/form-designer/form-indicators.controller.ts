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
import { CreateFormIndicatorDto } from './dto/create-form-indicator.dto';
import { PatchFormIndicatorDto } from './dto/patch-form-indicator.dto';
import { ReorderIndicatorsDto } from './dto/reorder-indicators.dto';

@Controller('forms/:formId/indicators')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class FormIndicatorsController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @QldlPermission('DESIGN_FORMS', 'READ')
  async list(@Param('formId', ParseUUIDPipe) formId: string) {
    return await this.formDesigner.listIndicators(formId);
  }

  @Post()
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: CreateFormIndicatorDto,
  ) {
    return await this.formDesigner.createIndicator(formId, dto);
  }

  @Patch(':indicatorId')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async patch(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('indicatorId', ParseUUIDPipe) indicatorId: string,
    @Body() dto: PatchFormIndicatorDto,
  ) {
    return await this.formDesigner.patchIndicator(formId, indicatorId, dto);
  }

  @Delete(':indicatorId')
  @QldlPermission('DESIGN_FORMS', 'DELETE')
  async remove(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('indicatorId', ParseUUIDPipe) indicatorId: string,
  ) {
    return await this.formDesigner.removeIndicator(formId, indicatorId);
  }

  @Post('reorder')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async reorder(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: ReorderIndicatorsDto,
  ) {
    return await this.formDesigner.reorderIndicators(formId, dto.orderedIds);
  }

  @Post('import')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async importJob(
    @Param('formId', ParseUUIDPipe) _formId: string,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.enqueueIndicatorsImport(user?.id);
  }
}
