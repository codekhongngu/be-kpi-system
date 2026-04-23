import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { FormDesignerService } from './form-designer.service';
import { CreateIndicatorCatalogDto } from './dto/create-indicator-catalog.dto';

@Controller('indicator-catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IndicatorCatalogController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Post()
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIndicatorCatalogDto,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.createCatalogEntry(dto, user?.id);
  }
}
