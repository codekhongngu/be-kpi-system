import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { AssignmentService } from '../assignment/assignment.service';
import { PendingApprovalsQueryDto } from './dto/pending-approvals-query.dto';
import { ReportAssignmentStatus } from '../../common';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly assignmentService: AssignmentService,
  ) {}

  private assertApproverOrg(user: User, assignment: FormAssignment) {
    if (user.orgId && assignment.orgId !== user.orgId) {
      throw new ForbiddenException('Không thuộc phạm vi đơn vị phê duyệt');
    }
  }

  async listPending(user: User, query: PendingApprovalsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin(FormAssignment, 'a', 'a.id = s.assignment_id')
      .innerJoin('organizations', 'o', 'o.id = a.org_id')
      .innerJoin('forms', 'f', 'f.id = a.form_id')
      .where('s.status = :st', { st: 'PENDING' });

    if (user.orgId) {
      qb.andWhere('a.org_id = :orgId', { orgId: user.orgId });
    }
    if (query.orgId) qb.andWhere('a.org_id = :qOrg', { qOrg: query.orgId });
    if (query.formId)
      qb.andWhere('a.form_id = :formId', { formId: query.formId });
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
      .where('s.status = :st', { st: 'PENDING' });
    if (user.orgId)
      countQb.andWhere('a.org_id = :orgId', { orgId: user.orgId });
    if (query.orgId)
      countQb.andWhere('a.org_id = :qOrg', { qOrg: query.orgId });
    if (query.formId)
      countQb.andWhere('a.form_id = :formId', { formId: query.formId });
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
    if (s.status !== 'PENDING')
      throw new ConflictException('APPROVAL_NOT_PENDING');
    s.status = 'APPROVED';
    s.approvedBy = user.id;
    s.approvedAt = new Date();
    await this.submissionRepo.save(s);

    // Update assignment status
    await this.assignmentService.updateAssignmentStatus(
      a.id,
      ReportAssignmentStatus.APPROVED,
      user.id,
      'Phê duyệt báo cáo',
    );

    if (s.submittedBy) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: s.submittedBy,
          type: 'SUBMISSION_APPROVED',
          title: 'Báo cáo đã được duyệt',
          body: `Báo cáo của bạn đã được duyệt. submissionId=${s.id}.`,
          channel: 'IN_APP',
          isRead: false,
          refTable: 'report_submissions',
          refId: null,
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
        }),
      );
    }
    return {
      status: 'APPROVED' as const,
      approvedAt: s.approvedAt.toISOString(),
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
    if (s.status !== 'PENDING')
      throw new ConflictException('APPROVAL_NOT_PENDING');
    s.status = 'REJECTED';
    s.rejectReason = reason.trim();
    await this.submissionRepo.save(s);

    // Update assignment status
    await this.assignmentService.updateAssignmentStatus(
      a.id,
      ReportAssignmentStatus.REJECTED,
      user.id,
      reason,
    );

    if (s.submittedBy) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: s.submittedBy,
          type: 'SUBMISSION_REJECTED',
          title: 'Báo cáo bị từ chối',
          body:
            `Báo cáo của bạn bị từ chối. ` +
            `submissionId=${s.id}. Lý do: ${s.rejectReason}`,
          channel: 'IN_APP',
          isRead: false,
          refTable: 'report_submissions',
          refId: null,
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
        }),
      );
    }
    return { status: 'REJECTED' as const };
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
}
