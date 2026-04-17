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
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleQueryDto } from '../dto/role-query.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return await this.roleService.create(createRoleDto);
  }

  @Get()
  async findAll(@Query() query: RoleQueryDto) {
    return await this.roleService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    return await this.roleService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return await this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.roleService.remove(id);
  }

  @Get(':id/permissions')
  async getPermissions(@Param('id') id: string): Promise<Permission[]> {
    return await this.roleService.getPermissions(id);
  }

  @Patch(':id/permissions')
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
