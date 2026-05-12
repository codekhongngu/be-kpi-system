import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { PendingApprovalsQueryDto } from './dto/pending-approvals-query.dto';
import { SubmissionService } from '../submission/submission.service';
import { SubmissionFlowEvent } from '../submission/entities/submission-flow-log.entity';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly submissionService: SubmissionService,
    private readonly dataSource: DataSource,
  ) {}

  private assertApproverOrg(user: User, assignment: FormAssignment) {
    if (user.orgId && assignment.orgId !== user.orgId) {
      throw new ForbiddenException('Không thuộc phạm vi đơn vị phê duyệt');
    }
  }

  async listPending(
    user: User,
    query: PendingApprovalsQueryDto,
    level: 'department' | 'district' | 'all' = 'department',
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const pendingStatuses =
      level === 'district'
        ? ['DEPARTMENT_APPROVED', 'APPROVED']
        : ['PENDING_DEPARTMENT', 'PENDING', 'SUBMITTED'];

    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin(FormAssignment, 'a', 'a.id = s.assignment_id')
      .innerJoin('organizations', 'o', 'o.id = a.org_id')
      .innerJoin('form_templates', 'f', 'f.id = a.template_id')
      .where('s.status IN (:...statuses)', { statuses: pendingStatuses });

    if (user.orgId) {
      qb.andWhere('a.org_id = :orgId', { orgId: user.orgId });
    }
    if (query.orgId) qb.andWhere('a.org_id = :qOrg', { qOrg: query.orgId });
    if (query.formId)
      qb.andWhere('a.template_id = :formId', { formId: query.formId });
    if (query.periodType)
      qb.andWhere('a.period_type = :periodType', { periodType: query.periodType });
    if (query.periodCode?.trim())
      qb.andWhere('a.period_code = :pc', { pc: query.periodCode.trim() });

    qb.select([
      's.id AS "submissionId"',
      's.submitted_at AS "submittedAt"',
      'o.id AS "orgId"',
      'o.code AS "orgCode"',
      'o.name AS "orgName"',
      'f.id AS "formId"',
      'f.code AS "formCode"',
      'f.name AS "formName"',
      'a.period_type AS "periodType"',
      'a.period_code AS "periodCode"',
      'a.period_name AS "periodName"',
    ])
      .orderBy('s.submitted_at', 'DESC')
      .skip(skip)
      .take(limit);

    const rows = await qb.getRawMany();
    const countQb = this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin(FormAssignment, 'a', 'a.id = s.assignment_id')
      .where('s.status IN (:...statuses)', { statuses: pendingStatuses });
    if (user.orgId)
      countQb.andWhere('a.org_id = :orgId', { orgId: user.orgId });
    if (query.orgId)
      countQb.andWhere('a.org_id = :qOrg', { qOrg: query.orgId });
    if (query.formId)
      countQb.andWhere('a.template_id = :formId', { formId: query.formId });
    if (query.periodType)
      countQb.andWhere('a.period_type = :periodType', { periodType: query.periodType });
    if (query.periodCode?.trim())
      countQb.andWhere('a.period_code = :pc', { pc: query.periodCode.trim() });
    const total = await countQb.getCount();

    const items = rows.map((r) => ({
      submissionId: r.submissionId,
      submittedAt: r.submittedAt,
      org: { id: r.orgId, code: r.orgCode, name: r.orgName },
      form: { id: r.formId, code: r.formCode, name: r.formName },
      period: {
        type: r.periodType,
        code: r.periodCode,
        name: r.periodName,
      },
    }));
    return { items, meta: { page, limit, total } };
  }

  // Legacy approve method kept for backward compatibility
  async approve(submissionId: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertApproverOrg(user, a);
    if (s.status !== 'PENDING_DEPARTMENT')
      throw new ConflictException('APPROVAL_NOT_PENDING');
    s.status = 'APPROVED';
    // Note: Cannot use approvedBy/approvedAt as they don't exist in the entity
    await this.submissionRepo.save(s);

    if (s.submittedBy) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: s.submittedBy,
          aggregateType: 'notification',
          type: 'SUBMISSION_APPROVED',
          payload: {
            title: 'Báo cáo đã được duyệt',
            body: `Báo cáo của bạn đã được duyệt. submissionId=${s.id}.`,
            channel: 'IN_APP',
            isRead: false,
            refTable: 'report_submissions',
            refId: null,
          },
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
        }),
      );
    }
    return {
      status: 'APPROVED' as const,
      approvedAt: new Date().toISOString(),
    };
  }

  async approveDepartment(submissionId: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');

    if (s.status !== 'PENDING_DEPARTMENT') {
      throw new ConflictException('SUBMISSION_NOT_PENDING_DEPARTMENT');
    }

    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');

    // Check user has department approval permission
    await this.validateDepartmentApprovalPermission(user, s);

    const fromStatus = s.status;
    s.status = 'DEPARTMENT_APPROVED';
    s.departmentApprovedBy = user.id;
    s.departmentApprovedAt = new Date();
    await this.submissionRepo.save(s);

    // Record flow history
    await this.submissionService.captureFlowLog(
      s.id,
      SubmissionFlowEvent.FORWARD,
      user.id,
      fromStatus,
      s.status,
    );

    // Notify district admins
    await this.notifyDistrictAdmins(submissionId);

    return {
      status: 'DEPARTMENT_APPROVED' as const,
      approvedAt: s.departmentApprovedAt.toISOString(),
    };
  }

  async rejectDepartment(submissionId: string, reason: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');

    if (s.status !== 'PENDING_DEPARTMENT') {
      throw new ConflictException('SUBMISSION_NOT_PENDING_DEPARTMENT');
    }

    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');

    // Check user has department approval permission
    await this.validateDepartmentApprovalPermission(user, s);

    const fromStatus = s.status;
    s.status = 'REJECTED_DEPARTMENT';
    s.rejectReason = reason;
    s.departmentApprovedBy = null;
    s.departmentApprovedAt = null;
    await this.submissionRepo.save(s);

    // Record flow history
    await this.submissionService.captureFlowLog(
      s.id,
      SubmissionFlowEvent.REJECT,
      user.id,
      fromStatus,
      s.status,
      reason,
    );

    // Notify submitter
    await this.notifySubmissionStatusChange(submissionId, 'REJECTED_DEPARTMENT', reason);

    return {
      status: 'REJECTED_DEPARTMENT' as const,
      rejectedAt: new Date(),
    };
  }

  async approveDistrict(submissionId: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');

    if (s.status !== 'DEPARTMENT_APPROVED') {
      throw new ConflictException('SUBMISSION_NOT_DEPARTMENT_APPROVED');
    }

    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');

    // Check user has district approval permission
    await this.validateDistrictApprovalPermission(user, s);

    const fromStatus = s.status;
    s.status = 'DISTRICT_APPROVED';
    s.districtApprovedBy = user.id;
    s.districtApprovedAt = new Date();
    await this.submissionRepo.save(s);

    // Record flow history
    await this.submissionService.captureFlowLog(
      s.id,
      SubmissionFlowEvent.APPROVE,
      user.id,
      fromStatus,
      s.status,
    );

    // Trigger summary generation
    await this.triggerSummaryGeneration(submissionId);

    // Notify submitter
    await this.notifySubmissionStatusChange(submissionId, 'DISTRICT_APPROVED');

    return {
      status: 'DISTRICT_APPROVED' as const,
      approvedAt: s.districtApprovedAt.toISOString(),
    };
  }

  async rejectDistrict(submissionId: string, reason: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');

    if (s.status !== 'DEPARTMENT_APPROVED') {
      throw new ConflictException('SUBMISSION_NOT_DEPARTMENT_APPROVED');
    }

    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');

    // Check user has district approval permission
    await this.validateDistrictApprovalPermission(user, s);

    const fromStatus = s.status;
    s.status = 'REJECTED_DISTRICT';
    s.rejectReason = reason;
    s.districtApprovedBy = null;
    s.districtApprovedAt = null;
    await this.submissionRepo.save(s);

    // Record flow history
    await this.submissionService.captureFlowLog(
      s.id,
      SubmissionFlowEvent.REJECT,
      user.id,
      fromStatus,
      s.status,
      reason,
    );

    // Notify submitter
    await this.notifySubmissionStatusChange(submissionId, 'REJECTED_DISTRICT', reason);

    return {
      status: 'REJECTED_DISTRICT' as const,
      rejectedAt: new Date(),
    };
  }

  async reject(submissionId: string, reason: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertApproverOrg(user, a);
    s.status = 'REJECTED';
    s.rejectReason = reason;
    // Note: Cannot set approvedBy/approvedAt as they don't exist in entity
    await this.submissionRepo.save(s);

    if (s.submittedBy) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: s.submittedBy,
          aggregateType: 'notification',
          type: 'SUBMISSION_REJECTED',
          payload: {
            body: `Báo cáo của bạn đã bị từ chối. submissionId=${s.id}. Lý do: ${s.rejectReason}`,
            channel: 'IN_APP',
            isRead: false,
            refTable: 'report_submissions',
            refId: null,
          },
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
        }),
      );
    }

    return {
      status: 'REJECTED' as const,
      rejectedAt: new Date(),
    };
  }

  async patchRejectNote(submissionId: string, reason: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertApproverOrg(user, a);
    s.rejectReason = reason.trim();
    await this.submissionRepo.save(s);
    return { ok: true as const };
  }

  private async validateDepartmentApprovalPermission(user: User, submission: ReportSubmission) {
    const hasPermission = await this.dataSource.query<{ count: number }>(
      `SELECT COUNT(1) as count
       FROM user_roles ur
       INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1 AND p.code = 'approvals.department.manage'`,
      [user.id]
    );
    
    if (hasPermission[0].count === 0) {
      throw new ForbiddenException('Không có quyền duyệt cấp phòng ban');
    }
  }

  private async validateDistrictApprovalPermission(user: User, submission: ReportSubmission) {
    const hasPermission = await this.dataSource.query<{ count: number }>(
      `SELECT COUNT(1) as count
       FROM user_roles ur
       INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1 AND p.code = 'approvals.district.manage'`,
      [user.id]
    );
    
    if (hasPermission[0].count === 0) {
      throw new ForbiddenException('Không có quyền duyệt cấp xã');
    }
  }

  private async notifyDistrictAdmins(submissionId: string) {
    const admins = await this.findDistrictApproverUserIds();
    
    if (admins.length === 0) {
      console.warn('No district admins found');
      return;
    }

    // Get submission details
    const submissionDetails = await this.getSubmissionDetails(submissionId);
    
    const notifications = admins.map(admin =>
      this.notificationRepo.create({
        userId: admin,
        aggregateType: 'notification',
        type: 'SUBMISSION_PENDING_DISTRICT',
        payload: {
          title: 'Báo cáo chờ duyệt cấp xã',
          body: `Báo cáo ${submissionDetails.code} từ ${submissionDetails.org_name} đã được duyệt phòng ban, chờ bạn duyệt.`,
          channel: 'IN_APP',
          isRead: false,
          refTable: 'report_submissions',
          refId: submissionId,
        },
        status: 'PENDING',
        retryCount: 0,
        sentAt: null,
      })
    );

    await this.notificationRepo.save(notifications);
  }

  private async notifySubmissionStatusChange(submissionId: string, status: string, reason?: string) {
    const submissionDetails = await this.getSubmissionDetails(submissionId);
    
    if (submissionDetails.submitted_by) {
      await this.notificationRepo.save({
        userId: submissionDetails.submitted_by,
        aggregateType: 'notification',
        type: this.getNotificationType(status),
        payload: {
          title: this.getNotificationTitle(status),
          body: this.getNotificationBody(status, submissionDetails, reason),
          channel: 'IN_APP',
          isRead: false,
          refTable: 'report_submissions',
          refId: submissionId,
        },
        status: 'PENDING',
        retryCount: 0,
        sentAt: null,
      });
    }
  }

  private async getSubmissionDetails(submissionId: string) {
    const result = await this.dataSource.query(
      `SELECT 
         s.id,
         s.code,
         s.status,
         s.submitted_at,
         s.department_approved_at,
         s.district_approved_at,
         s.reject_reason,
         o.name as org_name,
         o.code as org_code,
         a.period_name,
         a.period_code,
         f.name as form_name,
         u.full_name as submitted_by_name,
         u.email as submitted_by_email
       FROM report_submissions s
       INNER JOIN report_assignments a ON a.id = s.assignment_id
       INNER JOIN organizations o ON o.id = a.org_id
       INNER JOIN form_templates f ON f.id = a.template_id
       LEFT JOIN users u ON u.id = s.submitted_by
       WHERE s.id = $1`,
      [submissionId]
    );
    
    if (result.length === 0) {
      throw new NotFoundException('Submission not found');
    }
    
    return result[0];
  }

  private getNotificationType(status: string): string {
    const typeMap = {
      'DEPARTMENT_APPROVED': 'SUBMISSION_APPROVED_DEPARTMENT',
      'DISTRICT_APPROVED': 'SUBMISSION_APPROVED_DISTRICT',
      'REJECTED_DEPARTMENT': 'SUBMISSION_REJECTED_DEPARTMENT',
      'REJECTED_DISTRICT': 'SUBMISSION_REJECTED_DISTRICT'
    };
    return typeMap[status] || 'SUBMISSION_STATUS_CHANGED';
  }

  private getNotificationTitle(status: string): string {
    const titleMap = {
      'DEPARTMENT_APPROVED': 'Báo cáo đã được duyệt phòng ban',
      'DISTRICT_APPROVED': 'Báo cáo đã được duyệt cấp xã',
      'REJECTED_DEPARTMENT': 'Báo cáo bị từ chối phòng ban',
      'REJECTED_DISTRICT': 'Báo cáo bị từ chối cấp xã'
    };
    return titleMap[status] || 'Trạng thái báo cáo thay đổi';
  }

  private getNotificationBody(status: string, details: any, reason?: string): string {
    const bodyMap = {
      'DEPARTMENT_APPROVED': `Báo cáo ${details.code} đã được trưởng phòng ban duyệt.`,
      'DISTRICT_APPROVED': `Báo cáo ${details.code} đã được cấp xã duyệt. Báo cáo của bạn đã hoàn tất quy trình phê duyệt.`,
      'REJECTED_DEPARTMENT': `Báo cáo ${details.code} bị trưởng phòng ban từ chối.${reason ? ` Lý do: ${reason}` : ''}`,
      'REJECTED_DISTRICT': `Báo cáo ${details.code} bị cấp xã từ chối.${reason ? ` Lý do: ${reason}` : ''}`
    };
    return bodyMap[status] || `Trạng thái báo cáo ${details.code} đã thay đổi thành ${status}.`;
  }

  private async triggerSummaryGeneration(submissionId: string) {
    // This would trigger the summary generation for the assignment
    // Implementation depends on your summary service
    console.log(`Triggering summary generation for submission ${submissionId}`);
  }

  private async findDistrictApproverUserIds(): Promise<string[]> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `
      SELECT DISTINCT u.id
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN role_permissions rp ON rp.role_id = r.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE u.status = $1
        AND p.code = 'approvals.district.manage'
      `,
      [UserStatus.ACTIVE],
    );
    return rows.map((r) => r.id);
  }

  async getApprovalHistory(submissionId: string, user: User) {
    const history = await this.dataSource.query(
      `
      SELECT 
        fl.id,
        fl.submission_id,
        fl.event,
        fl.from_status,
        fl.to_status,
        fl.actor_id as user_id,
        fl.note,
        fl.created_at,
        u.full_name as user_name,
        s.code as submission_code
      FROM submission_flow_logs fl
      INNER JOIN users u ON u.id = fl.actor_id
      INNER JOIN report_submissions s ON s.id = fl.submission_id
      WHERE fl.submission_id = $1
      ORDER BY fl.created_at DESC
      `,
      [submissionId]
    );

    return history;
  }
}
