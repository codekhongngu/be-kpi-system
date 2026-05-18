import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { DashboardService } from './dashboard.service';
import { DashboardFieldCategoriesQueryDto } from './dto/dashboard-field-categories-query.dto';
import { DashboardFieldReportsQueryDto } from './dto/dashboard-field-reports-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('field-categories')
  @Permissions('reports.read')
  async listFieldCategories(@Query() query: DashboardFieldCategoriesQueryDto) {
    return await this.dashboardService.listFieldCategoriesWithTemplates(query);
  }

  @Get('field-categories/:fieldCategoryId/reports')
  @Permissions('reports.read')
  async getFieldCategoryReports(
    @Param('fieldCategoryId', ParseUUIDPipe) fieldCategoryId: string,
    @Query() query: DashboardFieldReportsQueryDto,
  ) {
    return await this.dashboardService.getFieldCategoryReports(
      fieldCategoryId,
      query,
    );
  }
}
