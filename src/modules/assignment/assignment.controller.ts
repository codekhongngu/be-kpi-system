import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { AssignmentService } from './assignment.service';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';
import { CancelAssignmentDto } from './dto/cancel-assignment.dto';
import { NextPeriodAssignmentsDto } from './dto/next-period-assignments.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @Permissions('assignments.manage')
  async list(@Query() query: AssignmentQueryDto) {
    return await this.assignmentService.findAll(query);
  }

  @Post()
  @Permissions('assignments.manage')
  async create(
    @Body() dto: CreateAssignmentsDto,
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.createBulk(dto, user?.id);
  }

  @Post(':id/cancel')
  @Permissions('assignments.manage')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelAssignmentDto,
  ) {
    return await this.assignmentService.cancel(id, body.reason);
  }

  @Post('next-period')
  @Permissions('assignments.manage')
  async nextPeriod(@Body() dto: NextPeriodAssignmentsDto) {
    return await this.assignmentService.nextPeriod(dto);
  }
}
