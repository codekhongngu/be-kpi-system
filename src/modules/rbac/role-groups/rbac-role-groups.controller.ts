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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QldlPermission, QldlRbacGuard } from '../../../common';
import { RbacService } from '../rbac.service';
import { CreateRoleGroupDto } from './dto/create-role-group.dto';
import { PatchRoleGroupDto } from './dto/patch-role-group.dto';

@Controller('role-groups')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class RbacRoleGroupsController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @QldlPermission('ADMIN_RBAC', 'READ')
  async list() {
    return await this.rbacService.listRoleGroups();
  }

  @Post()
  @QldlPermission('ADMIN_RBAC', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleGroupDto) {
    return await this.rbacService.createRoleGroup(dto);
  }

  @Patch(':id')
  @QldlPermission('ADMIN_RBAC', 'WRITE')
  async patch(@Param('id') id: string, @Body() dto: PatchRoleGroupDto) {
    return await this.rbacService.patchRoleGroup(id, dto);
  }

  @Delete(':id')
  @QldlPermission('ADMIN_RBAC', 'DELETE')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return await this.rbacService.deleteRoleGroup(id);
  }
}
