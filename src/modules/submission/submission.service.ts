import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ReportSubmission } from './entities/report-submission.entity';
import { ReportData } from './entities/report-data.entity';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { FormIndicator } from '../form-designer/entities/form-indicator.entity';
import { FormAttribute } from '../form-designer/entities/form-attribute.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { PatchCellsDto } from './dto/patch-cells.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { MyAssignmentsQueryDto } from './dto/my-assignments-query.dto';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
    @InjectRepository(ReportData)
    private readonly dataRepo: Repository<ReportData>,
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(FormIndicator)
    private readonly indicatorRepo: Repository<FormIndicator>,
    @InjectRepository(FormAttribute)
    private readonly attributeRepo: Repository<FormAttribute>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateSubmissionCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = `RS-${randomBytes(4).toString('hex').toUpperCase()}`;
      const exists = await this.submissionRepo.exist({
        where: { code },
      });
      if (!exists) return code;
    }
    throw new ConflictException('Không tạo được mã bản nộp');
  }

  private assertOrgScope(user: User, assignment: FormAssignment) {
    if (user.orgId && assignment.orgId !== user.orgId) {
      throw new ForbiddenException('Không thuộc phạm vi đơn vị của bạn');
    }
  }

  async myAssignments(user: User, query: MyAssignmentsQueryDto) {
    if (!user.orgId) {
      return { items: [] as unknown[] };
    }
    const qb = this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoin(ReportSubmission, 's', 's.assignment_id = a.id')
      .innerJoin('forms', 'f', 'f.id = a.form_id')
      .innerJoin('report_periods', 'p', 'p.id = a.period_id')
      .where('a.org_id = :orgId', { orgId: user.orgId })
      .andWhere('a.is_cancelled = false')
      .select([
        'a.id AS "assignmentId"',
        'a.deadline_to AS "deadlineTo"',
        'f.id AS "formId"',
        'f.code AS "formCode"',
        'f.name AS "formName"',
        'p.id AS "periodId"',
        'p.code AS "periodCode"',
        'p.name AS "periodName"',
        'p.date_from AS "periodDateFrom"',
        'p.date_to AS "periodDateTo"',
        's.id AS "submissionId"',
        's.status AS "submissionStatus"',
        's.completion_pct AS "completionPct"',
      ]);

    if (query.status === 'DRAFT') {
      qb.andWhere('(s.id IS NULL OR s.status = :st)', { st: 'DRAFT' });
    } else if (query.status) {
      qb.andWhere('s.status = :st', { st: query.status });
    }
    if (query.overdue === true) {
      qb.andWhere('a.deadline_to < CURRENT_DATE');
      qb.andWhere(
        '(s.id IS NULL OR s.status IN (:...open))',
        { open: ['DRAFT', 'REJECTED'] },
      );
    }

    const rows = await qb.getRawMany();
    const items = rows.map((r) => ({
      assignmentId: r.assignmentId,
      deadlineTo: r.deadlineTo,
      form: { id: r.formId, code: r.formCode, name: r.formName },
      period: {
        id: r.periodId,
        code: r.periodCode,
        name: r.periodName,
        dateFrom: r.periodDateFrom,
        dateTo: r.periodDateTo,
      },
      submission: r.submissionId
        ? {
            id: r.submissionId,
            status: r.submissionStatus,
            completionPct: r.completionPct != null ? Number(r.completionPct) : null,
          }
        : null,
    }));
    return { items };
  }

  async create(dto: CreateSubmissionDto, user: User) {
    const a = await this.assignmentRepo.findOne({ where: { id: dto.assignmentId } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    if (a.isCancelled) throw new ConflictException('ASSIGNMENT_CANCELLED');
    this.assertOrgScope(user, a);
    const exists = await this.submissionRepo.exist({
      where: { assignmentId: a.id },
    });
    if (exists) throw new ConflictException('SUBMISSION_ALREADY_EXISTS');
    const code = await this.generateSubmissionCode();
    const row = this.submissionRepo.create({
      code,
      assignmentId: a.id,
      status: 'DRAFT',
      version: 1,
    });
    const saved = await this.submissionRepo.save(row);
    return { id: saved.id, status: saved.status };
  }

  async findOne(id: string, user: User) {
    const s = await this.submissionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({ where: { id: s.assignmentId } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);
    const cells = await this.dataRepo.find({ where: { submissionId: id } });
    return {
      id: s.id,
      code: s.code,
      assignmentId: s.assignmentId,
      status: s.status,
      version: s.version,
      note: s.note,
      rejectReason: s.rejectReason,
      completionPct:
        s.completionPct != null ? Number(s.completionPct) : null,
      submittedAt: s.submittedAt,
      approvedAt: s.approvedAt,
      cells: cells.map((c) => ({
        indicatorId: c.indicatorId,
        attributeId: c.attributeId,
        valueText: c.value,
        valueNumeric: c.valueNumeric,
        updatedBy: c.updatedBy,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  async patchCells(id: string, dto: PatchCellsDto, user: User) {
    const s = await this.submissionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({ where: { id: s.assignmentId } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);
    if (!['DRAFT', 'REJECTED'].includes(s.status)) {
      throw new ConflictException('SUBMISSION_NOT_EDITABLE');
    }
    if (s.version !== dto.clientVersion) {
      throw new PreconditionFailedException('SUBMISSION_VERSION_MISMATCH');
    }
    const indIds = new Set(
      (await this.indicatorRepo.find({ where: { formId: a.formId } })).map(
        (i) => i.id,
      ),
    );
    const attrIds = new Set(
      (await this.attributeRepo.find({ where: { formId: a.formId } })).map(
        (x) => x.id,
      ),
    );
    const validationErrors: Array<{
      indicatorId: string;
      attributeId: string;
      code: string;
      message: string;
    }> = [];
    let saved = 0;
    for (const ch of dto.changes) {
      if (!indIds.has(ch.indicatorId) || !attrIds.has(ch.attributeId)) {
        validationErrors.push({
          indicatorId: ch.indicatorId,
          attributeId: ch.attributeId,
          code: 'CELL_KEY_INVALID',
          message: 'Ô không thuộc biểu mẫu của giao việc',
        });
        continue;
      }
      let cell = await this.dataRepo.findOne({
        where: {
          submissionId: id,
          indicatorId: ch.indicatorId,
          attributeId: ch.attributeId,
        },
      });
      if (!cell) {
        cell = this.dataRepo.create({
          submissionId: id,
          indicatorId: ch.indicatorId,
          attributeId: ch.attributeId,
        });
      }
      cell.value = ch.valueText ?? null;
      cell.valueNumeric = ch.valueNumeric ?? null;
      cell.updatedBy = user.id;
      await this.dataRepo.save(cell);
      saved++;
    }
    s.version += 1;
    await this.submissionRepo.save(s);
    return { saved, version: s.version, validationErrors };
  }

  async submit(id: string, dto: SubmitSubmissionDto, user: User) {
    const s = await this.submissionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({ where: { id: s.assignmentId } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);
    if (!['DRAFT', 'REJECTED'].includes(s.status)) {
      throw new ConflictException('SUBMISSION_NOT_EDITABLE');
    }
    s.status = 'PENDING';
    s.note = dto.note?.trim() ?? null;
    s.submittedBy = user.id;
    s.submittedAt = new Date();
    s.version += 1;
    await this.submissionRepo.save(s);

    // Auto notify approvers in the same org (RBAC QLDL: APPROVALS:WRITE)
    const approverIds = await this.findApproverUserIds(a.orgId);
    if (approverIds.length) {
      const title = 'Có báo cáo chờ duyệt';
      const body =
        `Báo cáo đã được gửi và đang chờ duyệt. ` +
        `submissionId=${s.id}, assignmentId=${a.id}.`;
      const rows = approverIds.map((uid) =>
        this.notificationRepo.create({
          userId: uid,
          type: 'SUBMISSION_PENDING_APPROVAL',
          title,
          body,
          channel: 'IN_APP',
          isRead: false,
          refTable: 'report_submissions',
          refId: null,
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
        }),
      );
      await this.notificationRepo.save(rows);
    }

    return { status: s.status as 'PENDING', submittedAt: s.submittedAt.toISOString() };
  }

  private async findApproverUserIds(orgId: string): Promise<string[]> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN role_groups rg_primary ON rg_primary.id = u.role_group_id
      LEFT JOIN user_role_groups urg ON urg.user_id = u.id
      LEFT JOIN role_groups rg2 ON rg2.id = urg.role_group_id
      WHERE u.org_id = $1
        AND u.status = $2
        AND (
          (COALESCE(rg_primary.permissions, '{}'::jsonb)->'APPROVALS') ? 'WRITE'
          OR (COALESCE(rg2.permissions, '{}'::jsonb)->'APPROVALS') ? 'WRITE'
        )
      `,
      [orgId, UserStatus.ACTIVE],
    );
    return rows.map((r) => r.id);
  }
}
