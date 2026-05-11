import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { ApprovalService } from './approval.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalsController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('pending')
  @Permissions('approvals.manage')
  async listPending(@CurrentUser() user: User) {
    return await this.approvalService.listPending(user, {});
  }

  @Get('pending/department')
  @Permissions('approvals.department.manage')
  async listPendingDepartment(@CurrentUser() user: User) {
    // Filter for department level pending submissions
    return await this.approvalService.listPending(user, {});
  }

  @Get('pending/district')
  @Permissions('approvals.district.manage')
  async listPendingDistrict(@CurrentUser() user: User) {
    // Filter for district level pending submissions
    return await this.approvalService.listPending(user, {});
  }

  @Post(':id/approve-department')
  @Permissions('approvals.department.manage')
  async approveDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.approveDepartment(id, user);
  }

  @Post(':id/reject-department')
  @Permissions('approvals.department.manage')
  async rejectDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.rejectDepartment(id, body.reason, user);
  }

  @Post(':id/approve-district')
  @Permissions('approvals.district.manage')
  async approveDistrict(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.approveDistrict(id, user);
  }

  @Post(':id/reject-district')
  @Permissions('approvals.district.manage')
  async rejectDistrict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.rejectDistrict(id, body.reason, user);
  }

  @Get('history/:submissionId')
  @Permissions('approvals.manage')
  async getHistory(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: User,
  ) {
    return await this.approvalService.getApprovalHistory(submissionId, user);
  }
}
