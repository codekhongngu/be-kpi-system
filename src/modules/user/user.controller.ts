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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, UserStatus } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.userService.create(createUserDto);
  }

  @Get()
  async findAll(@Query() query: UserQueryDto) {
    return await this.userService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.userService.remove(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ): Promise<User> {
    return await this.userService.updateStatus(id, status);
  }

  @Get('departments/:departmentId')
  async findByDepartment(
    @Param('departmentId') departmentId: string,
  ): Promise<User[]> {
    return await this.userService.findByDepartment(departmentId);
  }

  @Get(':id/permissions')
  async getUserPermissions(@Param('id') id: string): Promise<string[]> {
    return await this.userService.getUserPermissions(id);
  }

  @Patch(':id/roles')
  @HttpCode(HttpStatus.OK)
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<User> {
    return await this.userService.assignRoles(id, assignRolesDto);
  }
}
