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
  constructor(private readonly service: ReportCampaignService) { }

  @Get()
  //@Permissions('reports.view')
  async list(@Query() query: ReportCampaignQueryDto) {
    return await this.service.findAll(query);
  }

  @Post()
  //@Permissions('reports.view')
  async create(
    @Body() dto: CreateReportCampaignDto,
    @CurrentUser() user: User,
  ) {
    return await this.service.create(dto, user?.id);
  }

  @Get(':id')
  //@Permissions('reports.view')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.findOne(id);
  }

  @Get(':id/assignments')
  //@Permissions('reports.view')
  async listAssignments(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.listAssignments(id);
  }

  @Get(':id/summary-readiness')
  //@Permissions('reports.view')
  async summaryReadiness(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.getSummaryReadiness(id);
  }

  @Get(':id/assignments/:assignmentId/admin-view')
  //@Permissions('reports.view')
  async assignmentAdminView(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return await this.service.getAssignmentAdminView(id, assignmentId);
  }

  @Patch(':id')
  //@Permissions('reports.view')
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportCampaignDto,
  ) {
    return await this.service.patch(id, dto);
  }

  @Get(':id/scopes')
  //@Permissions('reports.view')
  async listScopes(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.listScopes(id);
  }

  @Post(':id/scopes')
  //@Permissions('reports.view')
  async upsertScopes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertReportCampaignScopesDto,
  ) {
    return await this.service.upsertScopes(id, dto);
  }

  @Delete(':id/scopes')
  //@Permissions('reports.view')
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
  //@Permissions('reports.view')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.service.cancel(id, user?.id);
  }

  @Post(':id/close')
  //@Permissions('reports.view')
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.service.close(id, user?.id);
  }

  // ── DefaultValues ─────────────────────────────────────────────────

  @Get(':id/default-values')
  //@Permissions('reports.view')
  async listDefaultValues(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.listDefaultValues(id);
  }

  @Post(':id/default-values')
  //@Permissions('reports.view')
  async upsertDefaultValues(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCampaignDefaultValuesDto,
  ) {
    return await this.service.upsertDefaultValues(id, dto);
  }

  @Delete(':id/default-values')
  //@Permissions('reports.view')
  async deleteDefaultValues(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteCampaignDefaultValuesDto,
  ) {
    return await this.service.deleteDefaultValues(id, dto);
  }
}
