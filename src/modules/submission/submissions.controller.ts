import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { PatchCellsDto } from './dto/patch-cells.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubmissionsController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @Permissions('submissions.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSubmissionDto, @CurrentUser() user: User) {
    return await this.submissionService.create(dto, user);
  }

  @Get(':id')
  @Permissions('submissions.manage')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return await this.submissionService.findOne(id, user);
  }

  @Patch(':id/cells')
  @Permissions('submissions.manage')
  async patchCells(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchCellsDto,
    @CurrentUser() user: User,
  ) {
    return await this.submissionService.patchCells(id, dto, user);
  }

  @Post(':id/submit')
  @Permissions('submissions.manage')
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return await this.submissionService.submit(id, dto, user);
  }
}
