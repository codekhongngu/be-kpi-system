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
import { Permissions, PermissionsGuard } from '../../common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';

@Controller('orgs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('orgs.manage')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  async list(@Query() query: OrganizationQueryDto) {
    return await this.service.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOrganizationDto) {
    const org = await this.service.create(dto);
    return { id: org.id };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    await this.service.update(id, dto);
    return { ok: true };
  }

  @Post(':id/lock')
  async lock(@Param('id') id: string) {
    return await this.service.lock(id);
  }

  @Post(':id/unlock')
  async unlock(@Param('id') id: string) {
    return await this.service.unlock(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.service.remove(id);
  }
}

