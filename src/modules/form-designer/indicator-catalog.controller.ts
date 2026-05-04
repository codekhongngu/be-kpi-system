import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CreateIndicatorCatalogDto } from './dto/create-indicator-catalog.dto';
import { UpdateIndicatorCatalogDto } from './dto/update-indicator-catalog.dto';
import { IndicatorCatalogQueryDto } from './dto/indicator-catalog-query.dto';

@Controller('indicator-catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IndicatorCatalogController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @Permissions('forms.manage')
  async list(@Query() query: IndicatorCatalogQueryDto) {
    return await this.formDesigner.findAllCatalogEntries(query);
  }

  @Post()
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIndicatorCatalogDto,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.createCatalogEntry(dto, user?.id);
  }

  @Patch(':id')
  @Permissions('forms.manage')
  async patch(@Param('id') id: string, @Body() dto: UpdateIndicatorCatalogDto) {
    return await this.formDesigner.patchCatalogEntry(id, dto);
  }

  @Delete(':id')
  @Permissions('forms.manage')
  async remove(@Param('id') id: string) {
    return await this.formDesigner.removeCatalogEntry(id);
  }
}
