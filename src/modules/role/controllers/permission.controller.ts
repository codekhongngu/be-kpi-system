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
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { PermissionQueryDto } from '../dto/permission-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permission } from '../entities/permission.entity';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    return await this.permissionService.create(createPermissionDto);
  }

  @Get()
  async findAll(@Query() query: PermissionQueryDto) {
    return await this.permissionService.findAll(query);
  }

  @Get('categories')
  async getCategories(): Promise<string[]> {
    return await this.permissionService.getCategories();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Permission> {
    return await this.permissionService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    return await this.permissionService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.permissionService.remove(id);
  }
}
