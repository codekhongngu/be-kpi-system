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
import { SubmissionFlowLog, SubmissionFlowEvent } from './entities/submission-flow-log.entity';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { FormIndicator } from '../template-management/entities/form-indicator.entity';
import { FormAttribute } from '../template-management/entities/form-attribute.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { PatchCellsDto } from './dto/patch-cells.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { MyAssignmentsQueryDto } from './dto/my-assignments-query.dto';
import {
  isSubmissionEditableStatus,
  normalizeSubmissionStatus,
} from './submission-status';

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
    @InjectRepository(SubmissionFlowLog)
    private readonly flowLogRepo: Repository<SubmissionFlowLog>,
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
      .leftJoin(ReportSubmission, 's', 's.assignmentId = a.id')
      .innerJoin('form_templates', 'f', 'f.id = a.formId')
      .where('a.orgId = :orgId', { orgId: user.orgId })
      .andWhere('a.isCancelled = false')
      .select([
        'a.id AS "assignmentId"',
        'a.deadlineTo AS "deadlineTo"',
        'f.id AS "formId"',
        'f.code AS "formCode"',
        'f.name AS "formName"',
        'a.periodType AS "periodType"',
        'a.periodCode AS "periodCode"',
        'a.periodName AS "periodName"',
        's.id AS "submissionId"',
        's.status AS "submissionStatus"',
        's.completion_pct AS "completionPct"',
      ]);

    const normalizedStatus = normalizeSubmissionStatus(query.status)
    if (normalizedStatus === 'UNOPENED' || normalizedStatus === 'NOT_STARTED') {
      qb.andWhere('s.id IS NULL');
    } else if (normalizedStatus === 'DRAFT') {
      qb.andWhere('s.status = :st', { st: 'DRAFT' });
    } else if (normalizedStatus) {
      if (normalizedStatus === 'all') {
        // no filter
      } else {
        qb.andWhere('s.status = :st', { st: normalizedStatus });
      }
    }
    
    if (query.q) {
      qb.andWhere('f.name ILIKE :q', { q: `%${query.q}%` });
    }
    
    if (query.periodType) {
      qb.andWhere('a.periodType = :pt', { pt: query.periodType });
    }

    if (query.overdue === true) {
      qb.andWhere('a.deadlineTo < CURRENT_DATE');
      qb.andWhere('(s.id IS NULL OR s.status IN (:...open))', {
        open: ['DRAFT', 'REJECTED_DEPARTMENT', 'REJECTED_DISTRICT'],
      });
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const total = await qb.getCount();
    
    qb.orderBy('a.assigned_at', 'DESC');
    qb.addOrderBy('s.created_at', 'DESC'); // Ensure latest submission is first
    qb.offset(skip).limit(limit);

    const rows = await qb.getRawMany();
    
    // Deduplicate in JS: keep only the first (latest) submission per assignment
    const uniqueMap = new Map();
    for (const r of rows) {
      if (!uniqueMap.has(r.assignmentId)) {
        uniqueMap.set(r.assignmentId, {
          assignmentId: r.assignmentId,
          deadlineTo: r.deadlineTo,
          form: { id: r.formId, code: r.formCode, name: r.formName },
          period: {
            type: r.periodType,
            code: r.periodCode,
            name: r.periodName,
          },
          submission: r.submissionId
            ? {
                id: r.submissionId,
                status: normalizeSubmissionStatus(r.submissionStatus),
                completionPct:
                  r.completionPct != null ? Number(r.completionPct) : null,
              }
            : null,
        });
      }
    }
    const items = Array.from(uniqueMap.values());
    
    return { items, total, page, limit };
  }

  async create(dto: CreateSubmissionDto, user: User) {
    const a = await this.assignmentRepo.findOne({
      where: { id: dto.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    if (a.isCancelled) throw new ConflictException('ASSIGNMENT_CANCELLED');
    this.assertOrgScope(user, a);

    // Upsert pattern: return existing submission if it already exists
    const existing = await this.submissionRepo.findOne({
      where: { assignmentId: a.id },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      return { id: existing.id, status: existing.status };
    }

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

  async findOrCreateByAssignment(assignmentId: string, user: User) {
    const a = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);

    let s = await this.submissionRepo.findOne({
      where: { assignmentId },
      order: { createdAt: 'DESC' },
    });

    if (!s) {
      if (a.isCancelled) throw new ConflictException('ASSIGNMENT_CANCELLED');
      const code = await this.generateSubmissionCode();
      const row = this.submissionRepo.create({
        code,
        assignmentId: a.id,
        status: 'DRAFT',
        version: 1,
      });
      s = await this.submissionRepo.save(row);
    }

    return this.findOne(s.id, user);
  }

  async findOne(id: string, user: User) {
    const s = await this.submissionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);
    const cells = await this.dataRepo.find({
      where: { submissionId: id },
      order: { indicatorId: 'ASC', attributeId: 'ASC' },
    });

    let defaultValues: Array<{
      indicatorId: string;
      attributeId: string;
      valueText: string | null;
      valueNumber: number | null;
    }> = [];
    if (a.batchId) {
      const rows = await this.dataSource.query(
        `SELECT indicator_id, attribute_id, value_text, value_number
         FROM report_campaign_default_values
         WHERE campaign_id = $1
         ORDER BY indicator_id ASC, attribute_id ASC`,
        [a.batchId],
      );
      defaultValues = rows.map((r: any) => ({
        indicatorId: r.indicator_id,
        attributeId: r.attribute_id,
        valueText: r.value_text,
        valueNumber: r.value_number != null ? Number(r.value_number) : null,
      }));
    }

    return {
      id: s.id,
      code: s.code,
      assignmentId: s.assignmentId,
      status: normalizeSubmissionStatus(s.status),
      version: s.version,
      note: s.note,
      rejectReason: s.rejectReason,
      completionPct: s.completionPct != null ? Number(s.completionPct) : null,
      submittedAt: s.submittedAt,
      departmentApprovedAt: s.departmentApprovedAt,
      districtApprovedAt: s.districtApprovedAt,
      defaultValues,
      cells: cells.map((c) => ({
        indicatorId: c.indicatorId,
        attributeId: c.attributeId,
        valueText: c.value,
        valueNumber: c.valueNumber != null ? Number(c.valueNumber) : null,
        updatedBy: c.updatedBy,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  async patchCells(id: string, dto: PatchCellsDto, user: User) {
    const s = await this.submissionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);
    if (!isSubmissionEditableStatus(s.status)) {
      throw new ConflictException('SUBMISSION_NOT_EDITABLE');
    }
    if (s.version !== dto.clientVersion) {
      throw new PreconditionFailedException('SUBMISSION_VERSION_MISMATCH');
    }
    let allowedIndicatorIds: Set<string> | null = null;
    if (a.batchId) {
      const rows = await this.dataSource.query<{ indicator_id: string }[]>(
        `
        SELECT indicator_id
        FROM report_campaign_indicator_org_scopes
        WHERE campaign_id = $1 AND org_id = $2
      `,
        [a.batchId, a.orgId],
      );
      if (rows.length > 0) {
        allowedIndicatorIds = new Set(rows.map((r) => r.indicator_id));
      }
    }
    const indIds = allowedIndicatorIds
      ? allowedIndicatorIds
      : new Set(
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

    const lockedCells = new Set<string>();
    if (a.batchId) {
      const dvRows = await this.dataSource.query<{ indicator_id: string; attribute_id: string }[]>(
        `SELECT indicator_id, attribute_id
         FROM report_campaign_default_values
         WHERE campaign_id = $1`,
        [a.batchId],
      );
      dvRows.forEach((r) => lockedCells.add(`${r.indicator_id}:${r.attribute_id}`));
    }

    let saved = 0;
    for (const ch of dto.changes) {
      if (lockedCells.has(`${ch.indicatorId}:${ch.attributeId}`)) {
        validationErrors.push({
          indicatorId: ch.indicatorId,
          attributeId: ch.attributeId,
          code: 'CELL_LOCKED_BY_DEFAULT_VALUE',
          message: 'Ô này đã có giá trị mặc định từ đợt báo cáo, không được chỉnh sửa',
        });
        continue;
      }

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
      cell.valueNumber = ch.valueNumber ?? null;
      cell.updatedBy = user.id;
      await this.dataRepo.save(cell);
      saved++;
    }

    // Calculate completion percentage
    const filledCount = await this.dataRepo.count({ where: { submissionId: id } });
    const totalEditable = indIds.size * attrIds.size - lockedCells.size;
    s.completionPct = totalEditable > 0 
      ? Math.min(100, (filledCount / totalEditable) * 100).toFixed(2)
      : '100.00';

    s.version += 1;
    await this.submissionRepo.save(s);
    return { saved, version: s.version, validationErrors };
  }

  async submit(id: string, dto: SubmitSubmissionDto, user: User) {
    const s = await this.submissionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);
    if (!isSubmissionEditableStatus(s.status)) {
      throw new ConflictException('SUBMISSION_NOT_EDITABLE');
    }
    const fromStatus = s.status;
    s.status = 'PENDING_DEPARTMENT';
    s.note = dto.note?.trim() ?? null;
    s.submittedBy = user.id;
    s.submittedAt = new Date();
    s.version += 1;
    await this.submissionRepo.save(s);

    // Capture flow log
    await this.captureFlowLog(
      s.id,
      SubmissionFlowEvent.SUBMIT,
      user.id,
      fromStatus,
      s.status,
      s.note,
    );

    // Auto notify department approvers in same org (RBAC QLDL: APPROVALS:WRITE)
    const approverIds = await this.findDepartmentApproverUserIds(a.orgId);
    if (approverIds.length) {
      const title = 'Báo cáo chờ duyệt cấp phòng ban';
      const body =
        `Báo cáo ${s.code} từ đơn vị ${a.orgId} đang chờ bạn duyệt.`;
      const rows = approverIds.map((uid) =>
        this.notificationRepo.create({
          userId: uid,
          aggregateType: 'notification',
          type: 'SUBMISSION_PENDING_DEPARTMENT',
          payload: {
            title,
            body,
            channel: 'IN_APP',
            isRead: false,
            refTable: 'report_submissions',
            refId: s.id,
          },
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
        }),
      );
      await this.notificationRepo.save(rows);
    }

    return {
      status: s.status as 'PENDING_DEPARTMENT',
      submittedAt: s.submittedAt.toISOString(),
    };
  }

  private async findDepartmentApproverUserIds(orgId: string): Promise<string[]> {
    // Find users with department approval permission in organization
    const rows = await this.dataSource.query<{ id: string }[]>(
      `
      SELECT DISTINCT u.id
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN role_permissions rp ON rp.role_id = r.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE u.org_id = $1
        AND u.status = $2
        AND p.code = 'approvals.department.manage'
      `,
      [orgId, UserStatus.ACTIVE],
    );
    return rows.map((r) => r.id);
  }

  private async findDistrictApproverUserIds(): Promise<string[]> {
    // Find users with district approval permission (cross-organization)
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

  async getSubmissionHistory(assignmentId: string, user: User) {
    const a = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);

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
      WHERE s.assignment_id = $1
      ORDER BY fl.created_at DESC
      `,
      [assignmentId]
    );

    return history.map((row: any) => ({
      ...row,
      from_status: normalizeSubmissionStatus(row.from_status),
      to_status: normalizeSubmissionStatus(row.to_status),
      submission_status: normalizeSubmissionStatus(row.submission_status),
    }));
  }
  async cancelSubmit(submissionId: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    this.assertOrgScope(user, a);

    if (normalizeSubmissionStatus(s.status) !== 'PENDING_DEPARTMENT') {
      throw new ConflictException('CHỈ_ĐƯỢC_HỦY_NỘP_KHI_ĐANG_CHỜ_DUYỆT_PHÒNG');
    }

    s.status = 'DRAFT';
    s.submittedAt = null;
    s.submittedBy = null;
    await this.submissionRepo.save(s);

    return { status: s.status };
  }

  async captureFlowLog(
    submissionId: string,
    event: SubmissionFlowEvent,
    actorId: string,
    fromStatus: string | null,
    toStatus: string,
    note?: string | null,
  ) {
    const cells = await this.dataRepo.find({
      where: { submissionId },
    });

    const s = await this.submissionRepo.findOne({ where: { id: submissionId } });

    const snapshot = {
      cells: cells.map((c) => ({
        indicatorId: c.indicatorId,
        attributeId: c.attributeId,
        value: c.value,
        valueNumber: c.valueNumber,
      })),
      metadata: {
        completionPct: s?.completionPct,
        version: s?.version,
      },
    };

    const log = this.flowLogRepo.create({
      submissionId,
      event,
      fromStatus,
      toStatus,
      actorId,
      note,
      snapshot,
    });

    await this.flowLogRepo.save(log);
  }

  async getFlowLogDetails(id: string, user: User) {
    const log = await this.flowLogRepo.findOne({
      where: { id },
    });
    if (!log) throw new NotFoundException('Không tìm thấy bản ghi lịch sử');
    
    // Check permission (optional: check if user belongs to the org of the submission)
    return log;
  }
}


