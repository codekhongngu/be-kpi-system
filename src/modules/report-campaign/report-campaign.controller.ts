import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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

@Controller('report-campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportCampaignController {
  constructor(private readonly service: ReportCampaignService) {}

  @Post()
  @Permissions('campaigns.manage', 'assignments.manage')
  async create(@Body() dto: CreateReportCampaignDto, @CurrentUser() user: User) {
    return await this.service.create(dto, user?.id);
  }

  @Get(':id')
  @Permissions('campaigns.manage', 'assignments.manage')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.findOne(id);
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
  async confirmDispatch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return await this.service.confirmDispatch(id, user?.id);
  }
}


