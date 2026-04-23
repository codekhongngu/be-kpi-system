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
import { Permissions, PermissionsGuard } from '../../common';
import { User, UserStatus } from './entities/user.entity';
import { ResetPasswordBodyDto } from './dto/reset-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDetail, UserListItem } from './types/user-contract.types';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions('users.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<{ id: string }> {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @Permissions('users.manage')
  async findAll(@Query() query: UserQueryDto) {
    return await this.userService.findAll(query);
  }

  @Get('departments/:departmentId')
  @Permissions('users.manage')
  async findByDepartment(
    @Param('departmentId') departmentId: string,
  ): Promise<UserListItem[]> {
    return await this.userService.findByDepartment(departmentId);
  }

  @Post('import')
  @Permissions('users.export')
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
  @Permissions('users.manage')
  async importStatus(@Param('jobId') jobId: string) {
    return await this.userService.getImportJob(jobId);
  }

  @Get(':id')
  @Permissions('users.manage')
  async findOne(@Param('id') id: string): Promise<UserDetail> {
    return await this.userService.findOneDetail(id);
  }

  @Patch(':id')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<{ ok: true }> {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    return await this.userService.remove(id);
  }

  @Patch(':id/status')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ): Promise<{ ok: true }> {
    return await this.userService.updateStatus(id, status);
  }

  @Patch(':id/activate')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return await this.userService.activate(id);
  }

  @Patch(':id/deactivate')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    return await this.userService.deactivate(id);
  }

  @Post(':id/reset-password')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id') id: string,
    @Body() body: ResetPasswordBodyDto,
  ) {
    return await this.userService.resetPassword(id, body.newPassword);
  }

  @Get(':id/permissions')
  @Permissions('users.manage')
  async getUserPermissions(@Param('id') id: string): Promise<string[]> {
    return await this.userService.getUserPermissions(id);
  }

  @Patch(':id/roles')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<{ ok: true }> {
    return await this.userService.assignRoles(id, assignRolesDto);
  }
}
