import {
  Body,
  Controller,
  Delete,
  Get,
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
import { ReportCampaignService } from './report-campaign.service';
import { CreateReportCampaignDto } from './dto/create-report-campaign.dto';
import { UpdateReportCampaignDto } from './dto/update-report-campaign.dto';
import { UpsertReportCampaignScopesDto } from './dto/upsert-report-campaign-scopes.dto';
import { ReportCampaignQueryDto } from './dto/report-campaign-query.dto';
import {
  UpsertCampaignDefaultValuesDto,
  DeleteCampaignDefaultValuesDto,
} from './dto/upsert-campaign-default-values.dto';

@Controller('report-campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportCampaignController {
  constructor(private readonly service: ReportCampaignService) {}

  @Get()
  @Permissions('campaigns.manage', 'assignments.manage')
  async list(@Query() query: ReportCampaignQueryDto) {
    return await this.service.findAll(query);
  }

  @Post()
  @Permissions('campaigns.manage', 'assignments.manage')
  async create(
    @Body() dto: CreateReportCampaignDto,
    @CurrentUser() user: User,
  ) {
    return await this.service.create(dto, user?.id);
  }

  @Get(':id')
  @Permissions('campaigns.manage', 'assignments.manage')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.findOne(id);
  }

  @Get(':id/assignments')
  @Permissions('campaigns.manage', 'assignments.manage')
  async listAssignments(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.listAssignments(id);
  }

  @Patch(':id')
  @Permissions('campaigns.manage', 'assignments.manage')
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportCampaignDto,
  ) {
    return await this.service.patch(id, dto);
  }

  @Get(':id/scopes')
  @Permissions('campaigns.manage', 'assignments.manage')
  async listScopes(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.listScopes(id);
  }

  @Post(':id/scopes')
  @Permissions('campaigns.manage', 'assignments.manage')
  async upsertScopes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertReportCampaignScopesDto,
  ) {
    return await this.service.upsertScopes(id, dto);
  }

  @Delete(':id/scopes')
  @Permissions('campaigns.manage', 'assignments.manage')
  async deleteScopes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertReportCampaignScopesDto,
  ) {
    return await this.service.deleteScopes(id, dto);
  }

  @Post(':id/confirm-dispatch')
  @Permissions('campaigns.dispatch', 'assignments.manage')
  async confirmDispatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.service.confirmDispatch(id, user?.id);
  }

  @Post(':id/cancel')
  @Permissions('campaigns.manage', 'assignments.manage')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.service.cancel(id, user?.id);
  }

  @Post(':id/close')
  @Permissions('campaigns.manage', 'assignments.manage')
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.service.close(id, user?.id);
  }

  // ── DefaultValues ─────────────────────────────────────────────────

  @Get(':id/default-values')
  @Permissions('campaigns.manage', 'assignments.manage')
  async listDefaultValues(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.listDefaultValues(id);
  }

  @Post(':id/default-values')
  @Permissions('campaigns.manage', 'assignments.manage')
  async upsertDefaultValues(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCampaignDefaultValuesDto,
  ) {
    return await this.service.upsertDefaultValues(id, dto);
  }

  @Delete(':id/default-values')
  @Permissions('campaigns.manage', 'assignments.manage')
  async deleteDefaultValues(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteCampaignDefaultValuesDto,
  ) {
    return await this.service.deleteDefaultValues(id, dto);
  }
}
