import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleQueryDto } from '../dto/role-query.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../../common';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

type RbacAction = 'READ' | 'WRITE' | 'DELETE' | 'EXPORT';

class CreateRoleGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  permissions: Record<string, RbacAction[]>;
}

class PatchRoleGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, RbacAction[]>;
}

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Permissions('roles.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return await this.roleService.create(createRoleDto);
  }

  @Get()
  @Permissions('roles.manage')
  async findAll(@Query() query: RoleQueryDto) {
    return await this.roleService.findAll(query);
  }

  @Get(':id')
  @Permissions('roles.manage')
  async findOne(@Param('id') id: string): Promise<Role> {
    return await this.roleService.findOne(id);
  }

  @Patch(':id')
  @Permissions('roles.manage')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return await this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Permissions('roles.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.roleService.remove(id);
  }

  @Get(':id/permissions')
  @Permissions('roles.manage')
  async getPermissions(@Param('id') id: string): Promise<Permission[]> {
    return await this.roleService.getPermissions(id);
  }

  @Patch(':id/permissions')
  @Permissions('roles.manage')
  @HttpCode(HttpStatus.OK)
  async updatePermissions(
    @Param('id') id: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<Role> {
    return await this.roleService.updatePermissions(
      id,
      updateRolePermissionsDto,
    );
  }
}

@Controller('role-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleGroupsController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Permissions('roles.manage')
  async list() {
    return await this.roleService.listRoleGroups();
  }

  @Post()
  @Permissions('roles.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleGroupDto) {
    return await this.roleService.createRoleGroup(dto);
  }

  @Patch(':id')
  @Permissions('roles.manage')
  async patch(@Param('id') id: string, @Body() dto: PatchRoleGroupDto) {
    return await this.roleService.patchRoleGroup(id, dto);
  }

  @Delete(':id')
  @Permissions('roles.manage')
  async remove(@Param('id') id: string) {
    return await this.roleService.removeRoleGroup(id);
  }
}


