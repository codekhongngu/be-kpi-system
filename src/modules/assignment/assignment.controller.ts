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
import { ConfigureAssignmentIndicatorScopesDto } from './dto/configure-assignment-indicator-scopes.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @Permissions('assignments.manage')
  async list(@Query() query: AssignmentQueryDto) {
    return await this.assignmentService.findAll(query);
  }

  @Get('batches')
  @Permissions('assignments.manage')
  async listBatches(@Query() query: any) {
    return await this.assignmentService.findAllBatches(query);
  }

  @Get('batches/:id')
  @Permissions('assignments.manage')
  async getBatch(@Param('id', ParseUUIDPipe) id: string) {
    return await this.assignmentService.findBatchById(id);
  }

  @Post()
  @Permissions('assignments.manage')
  async create(@Body() dto: CreateAssignmentsDto, @CurrentUser() user: User) {
    return await this.assignmentService.createBatch(dto, user?.id);
  }

  @Post('batches/:id')
  @Permissions('assignments.manage')
  async updateBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateAssignmentsDto>,
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.updateBatch(id, dto, user.id);
  }

  @Post('batches/:id/delete')
  @Permissions('assignments.manage')
  async deleteBatch(@Param('id', ParseUUIDPipe) id: string) {
    return await this.assignmentService.deleteBatch(id);
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

  @Post('batches/:id/publish')
  @Permissions('assignments.manage')
  async publishBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.publishBatch(id, user.id);
  }

  @Post('batches/:id/cancel')
  @Permissions('assignments.manage')
  async cancelBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelAssignmentDto,
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.cancelBatch(id, user.id, body.reason);
  }

  @Get('batches/:id/history')
  @Permissions('assignments.manage')
  async getBatchHistory(@Param('id', ParseUUIDPipe) id: string) {
    return await this.assignmentService.getBatchHistory(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return await this.assignmentService.getHistory(id);
  }

  @Get(':id/comments')
  async getComments(@Param('id', ParseUUIDPipe) id: string) {
    return await this.assignmentService.getComments(id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { content: string; type?: string },
    @CurrentUser() user: User,
  ) {
    return await this.assignmentService.addComment(
      id,
      user.id,
      body.content,
      body.type,
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
