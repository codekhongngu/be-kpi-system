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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../../common';
import { ReportAssignmentService } from './assignment.service';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';
import { CancelAssignmentDto } from './dto/cancel-assignment.dto';
import { NextPeriodAssignmentsDto } from './dto/next-period-assignments.dto';
import { ConfigureAssignmentIndicatorScopesDto } from './dto/configure-assignment-indicator-scopes.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportAssignmentController {
  constructor(private readonly assignmentService: ReportAssignmentService) {}

  @Get()
  @Permissions('assignments.manage')
  async list(@Query() query: AssignmentQueryDto) {
    return await this.assignmentService.findAll(query);
  }

  @Post()
  @Permissions('assignments.manage')
  async create(@Body() dto: CreateAssignmentsDto, @CurrentUser() user: User) {
    return await this.assignmentService.createBatch(dto, user?.id);
  }

  @Post(':batchId/indicator-scopes')
  @Permissions('assignments.manage')
  async configureIndicatorScopes(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: ConfigureAssignmentIndicatorScopesDto,
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.configureIndicatorScopes(
      batchId,
      dto,
      user?.id,
    );
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



