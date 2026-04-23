import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { ApprovalService } from './approval.service';
import { PendingApprovalsQueryDto } from './dto/pending-approvals-query.dto';
import { ApproveDto } from './dto/approve.dto';
import { RejectDto } from './dto/reject.dto';
import { PatchRejectNoteDto } from './dto/patch-reject-note.dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('pending')
  @Permissions('approvals.manage')
  async pending(
    @CurrentUser() user: User,
    @Query() query: PendingApprovalsQueryDto,
  ) {
    return await this.approvalService.listPending(user, query);
  }

  @Post(':submissionId/approve')
  @Permissions('approvals.manage')
  async approve(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() _dto: ApproveDto,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.approve(submissionId, user);
  }

  @Post(':submissionId/reject')
  @Permissions('approvals.manage')
  async reject(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: RejectDto,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.reject(submissionId, dto.reason, user);
  }

  @Patch(':submissionId/reject-note')
  @Permissions('approvals.manage')
  async patchRejectNote(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: PatchRejectNoteDto,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.patchRejectNote(submissionId, dto.reason, user);
  }
}
