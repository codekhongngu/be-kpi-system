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
import { QldlPermission, QldlRbacGuard } from '../../common';
import { AssignmentService } from './assignment.service';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';
import { CancelAssignmentDto } from './dto/cancel-assignment.dto';
import { NextPeriodAssignmentsDto } from './dto/next-period-assignments.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @QldlPermission('OPS_ASSIGNMENTS', 'READ')
  async list(@Query() query: AssignmentQueryDto) {
    return await this.assignmentService.findAll(query);
  }

  @Post()
  @QldlPermission('OPS_ASSIGNMENTS', 'WRITE')
  async create(
    @Body() dto: CreateAssignmentsDto,
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.createBulk(dto, user?.id);
  }

  @Post(':id/cancel')
  @QldlPermission('OPS_ASSIGNMENTS', 'WRITE')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelAssignmentDto,
  ) {
    return await this.assignmentService.cancel(id, body.reason);
  }

  @Post('next-period')
  @QldlPermission('OPS_ASSIGNMENTS', 'WRITE')
  async nextPeriod(@Body() dto: NextPeriodAssignmentsDto) {
    return await this.assignmentService.nextPeriod(dto);
  }
}
