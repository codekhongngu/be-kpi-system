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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QldlPermission, QldlRbacGuard } from '../../common';
import { User, UserStatus } from './entities/user.entity';
import { ResetPasswordBodyDto } from './dto/reset-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDetail, UserListItem } from './types/user-contract.types';

@Controller('users')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<{ id: string }> {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @QldlPermission('ADMIN_USERS', 'READ')
  async findAll(@Query() query: UserQueryDto) {
    return await this.userService.findAll(query);
  }

  @Get('departments/:departmentId')
  @QldlPermission('ADMIN_USERS', 'READ')
  async findByDepartment(
    @Param('departmentId') departmentId: string,
  ): Promise<UserListItem[]> {
    return await this.userService.findByDepartment(departmentId);
  }

  @Post('import')
  @QldlPermission('ADMIN_USERS', 'EXPORT')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async importUsers(
    @CurrentUser() user: User,
    @UploadedFile() file: { buffer?: Buffer } | undefined,
  ): Promise<{ jobId: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('Thiếu file CSV (field name: file)');
    }
    return await this.userService.createImportJob(user.id, file.buffer);
  }

  @Get('import/:jobId')
  @QldlPermission('ADMIN_USERS', 'READ')
  async importStatus(@Param('jobId') jobId: string) {
    return await this.userService.getImportJob(jobId);
  }

  @Get(':id')
  @QldlPermission('ADMIN_USERS', 'READ')
  async findOne(@Param('id') id: string): Promise<UserDetail> {
    return await this.userService.findOneDetail(id);
  }

  @Patch(':id')
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<{ ok: true }> {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @QldlPermission('ADMIN_USERS', 'DELETE')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    return await this.userService.remove(id);
  }

  @Patch(':id/status')
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ): Promise<{ ok: true }> {
    return await this.userService.updateStatus(id, status);
  }

  @Patch(':id/activate')
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return await this.userService.activate(id);
  }

  @Patch(':id/deactivate')
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    return await this.userService.deactivate(id);
  }

  @Post(':id/reset-password')
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id') id: string,
    @Body() body: ResetPasswordBodyDto,
  ) {
    return await this.userService.resetPassword(id, body.newPassword);
  }

  @Get(':id/permissions')
  @QldlPermission('ADMIN_USERS', 'READ')
  async getUserPermissions(@Param('id') id: string): Promise<string[]> {
    return await this.userService.getUserPermissions(id);
  }

  @Patch(':id/roles')
  @QldlPermission('ADMIN_USERS', 'WRITE')
  @HttpCode(HttpStatus.OK)
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<{ ok: true }> {
    return await this.userService.assignRoles(id, assignRolesDto);
  }
}
