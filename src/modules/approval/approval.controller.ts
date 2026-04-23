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
import { QldlPermission, QldlRbacGuard } from '../../common';
import { ApprovalService } from './approval.service';
import { PendingApprovalsQueryDto } from './dto/pending-approvals-query.dto';
import { ApproveDto } from './dto/approve.dto';
import { RejectDto } from './dto/reject.dto';
import { PatchRejectNoteDto } from './dto/patch-reject-note.dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('pending')
  @QldlPermission('APPROVALS', 'READ')
  async pending(
    @CurrentUser() user: User,
    @Query() query: PendingApprovalsQueryDto,
  ) {
    return await this.approvalService.listPending(user, query);
  }

  @Post(':submissionId/approve')
  @QldlPermission('APPROVALS', 'WRITE')
  async approve(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() _dto: ApproveDto,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.approve(submissionId, user);
  }

  @Post(':submissionId/reject')
  @QldlPermission('APPROVALS', 'WRITE')
  async reject(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: RejectDto,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.reject(submissionId, dto.reason, user);
  }

  @Patch(':submissionId/reject-note')
  @QldlPermission('APPROVALS', 'WRITE')
  async patchRejectNote(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: PatchRejectNoteDto,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.patchRejectNote(submissionId, dto.reason, user);
  }
}
