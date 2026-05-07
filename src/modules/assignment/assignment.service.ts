import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource, IsNull } from 'typeorm';
import { FormAssignment } from './entities/form-assignment.entity';
import { AssignmentBatch } from './entities/assignment-batch.entity';
import { AssignmentIndicatorScope } from './entities/assignment-indicator-scope.entity';
import { ReportStatusHistory } from './entities/report-status-history.entity';
import { AssignmentStatusHistory } from './entities/assignment-status-history.entity';
import { ReportComment } from './entities/report-comment.entity';
import { Form } from '../form-designer/entities/form.entity';
import { FormIndicator } from '../form-designer/entities/form-indicator.entity';
import { Organization } from '../organization/entities/organization.entity';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';
import { NextPeriodAssignmentsDto } from './dto/next-period-assignments.dto';
import { ConfigureAssignmentIndicatorScopesDto } from './dto/configure-assignment-indicator-scopes.dto';
import { PeriodType, ReportStatus, ReportAssignmentStatus } from '../../common';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(AssignmentBatch)
    private readonly batchRepo: Repository<AssignmentBatch>,
    @InjectRepository(AssignmentIndicatorScope)
    private readonly scopeRepo: Repository<AssignmentIndicatorScope>,
    @InjectRepository(ReportStatusHistory)
    private readonly reportHistoryRepo: Repository<ReportStatusHistory>,
    @InjectRepository(AssignmentStatusHistory)
    private readonly assignmentHistoryRepo: Repository<AssignmentStatusHistory>,
    @InjectRepository(ReportComment)
    private readonly commentRepo: Repository<ReportComment>,
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormIndicator)
    private readonly indicatorRepo: Repository<FormIndicator>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: AssignmentQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;
    const qb = this.assignmentRepo.createQueryBuilder('a');
    qb.leftJoinAndSelect('a.batchRef', 'batch');
    if (query.formId)
      qb.andWhere('a.formId = :formId', { formId: query.formId });
    if (query.periodType)
      qb.andWhere('a.periodType = :periodType', { periodType: query.periodType });
    if (query.periodCode?.trim())
      qb.andWhere('a.periodCode = :periodCode', {
        periodCode: query.periodCode.trim(),
      });
    if (query.orgId) qb.andWhere('a.orgId = :orgId', { orgId: query.orgId });
    if (query.isCancelled !== undefined) {
      qb.andWhere('a.isCancelled = :ic', { ic: query.isCancelled });
    }
    qb.orderBy('a.assignedAt', 'DESC').skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async findAllBatches(query: any) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;
    const qb = this.batchRepo.createQueryBuilder('b');
    
    if (query.formId) qb.andWhere('b.formId = :formId', { formId: query.formId });
    if (query.status) qb.andWhere('b.status = :status', { status: query.status });
    if (query.periodType) qb.andWhere('b.periodType = :periodType', { periodType: query.periodType });

    qb.orderBy('b.createdAt', 'DESC').skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async findBatchById(id: string) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt báo cáo');
    
    // Lấy danh sách các đơn vị đã được giao trong batch này
    const assignments = await this.assignmentRepo.find({
      where: { batchId: id, isCancelled: false },
    });

    return { ...batch, assignments };
  }

  async updateBatch(id: string, dto: Partial<CreateAssignmentsDto>, userId: string) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt báo cáo');
    
    if (batch.status !== ReportStatus.DRAFT) {
      throw new ConflictException('Chỉ có thể sửa đợt báo cáo ở trạng thái nháp');
    }

    if (dto.periodName) batch.periodName = dto.periodName;
    if (dto.deadlineFrom) batch.deadlineFrom = dto.deadlineFrom.slice(0, 10);
    if (dto.deadlineTo) batch.deadlineTo = dto.deadlineTo.slice(0, 10);
    
    const saved = await this.batchRepo.save(batch);
    
    await this.reportHistoryRepo.save(
      this.reportHistoryRepo.create({
        reportId: batch.id,
        fromStatus: batch.status,
        toStatus: batch.status,
        actorId: userId,
        note: 'Cập nhật thông tin chung đợt báo cáo',
      }),
    );

    return saved;
  }

  async deleteBatch(id: string) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt báo cáo');
    
    if (batch.status !== ReportStatus.DRAFT) {
      throw new ConflictException('Chỉ có thể xóa đợt báo cáo ở trạng thái nháp');
    }

    // Xóa các assignment liên quan (nếu chưa có dữ liệu nhập)
    const assignments = await this.assignmentRepo.find({ where: { batchId: id } });
    for (const a of assignments) {
      const hasSubmission = await this.dataSource.query(
        'SELECT 1 FROM report_submissions WHERE assignment_id = $1 LIMIT 1',
        [a.id]
      );
      if (hasSubmission.length > 0) {
        throw new ConflictException(`Không thể xóa vì đơn vị ${a.orgId} đã có dữ liệu nhập`);
      }
    }

    await this.assignmentRepo.delete({ batchId: id });
    await this.scopeRepo.delete({ batchId: id });
    await this.reportHistoryRepo.delete({ reportId: id });
    await this.batchRepo.delete(id);

    return { ok: true };
  }

  async createBatch(dto: CreateAssignmentsDto, userId: string | undefined) {
    const form = await this.formRepo.findOne({ where: { id: dto.formId } });
    if (!form) throw new NotFoundException('Không tìm thấy biểu mẫu');
    if (!form.isActive) throw new ConflictException('ASSIGNMENT_FORM_INACTIVE');

    const periodCode = dto.periodCode?.trim();
    if (!periodCode) throw new BadRequestException('PERIOD_CODE_REQUIRED');
    if (dto.deadlineTo.slice(0, 10) < dto.deadlineFrom.slice(0, 10)) {
      throw new BadRequestException('DEADLINE_INVALID_RANGE');
    }

    const periodName = dto.periodName?.trim() || null;
    const exists = await this.batchRepo.exist({
      where: { formId: dto.formId, periodType: dto.periodType, periodCode },
    });
    if (exists) throw new ConflictException('ASSIGNMENT_BATCH_DUPLICATE');

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        formId: dto.formId,
        templateVersion: 1,
        periodType: dto.periodType,
        periodCode,
        periodName,
        deadlineFrom: dto.deadlineFrom.slice(0, 10),
        deadlineTo: dto.deadlineTo.slice(0, 10),
        status: ReportStatus.DRAFT,
        createdBy: userId ?? null,
      }),
    );
    
    // Log history
    await this.reportHistoryRepo.save(
      this.reportHistoryRepo.create({
        reportId: batch.id,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        actorId: userId ?? '00000000-0000-0000-0000-000000000000',
        note: 'Khởi tạo đợt báo cáo',
      }),
    );

    return {
      id: batch.id,
      formId: batch.formId,
      status: batch.status,
      periodType: batch.periodType,
      periodCode: batch.periodCode,
      periodName: batch.periodName,
      deadlineFrom: batch.deadlineFrom,
      deadlineTo: batch.deadlineTo,
    };
  }

  async publishBatch(id: string, userId: string) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt báo cáo');
    if (batch.status !== ReportStatus.DRAFT) {
      throw new ConflictException('Chỉ có thể phát hành đợt báo cáo ở trạng thái nháp');
    }
    if (batch.totalAssignments === 0) {
      throw new BadRequestException('Đợt báo cáo chưa được giao cho đơn vị nào');
    }

    const oldStatus = batch.status;
    batch.status = ReportStatus.ASSIGNED;
    batch.publishedAt = new Date();
    await this.batchRepo.save(batch);

    await this.reportHistoryRepo.save(
      this.reportHistoryRepo.create({
        reportId: batch.id,
        fromStatus: oldStatus,
        toStatus: ReportStatus.ASSIGNED,
        actorId: userId,
        note: 'Phát hành báo cáo',
      }),
    );

    return { ok: true, status: batch.status };
  }

  async cancelBatch(id: string, userId: string, reason?: string) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt báo cáo');
    if (batch.status === ReportStatus.CANCELLED || batch.status === ReportStatus.COMPLETED) {
      throw new ConflictException('Không thể hủy đợt báo cáo đã hoàn tất hoặc đã hủy');
    }

    const oldStatus = batch.status;
    batch.status = ReportStatus.CANCELLED;
    await this.batchRepo.save(batch);

    // Cancel all assignments in this batch
    await this.assignmentRepo.update(
      { batchId: id, isCancelled: false },
      { isCancelled: true, cancelReason: reason || 'Hủy đợt báo cáo tổng' },
    );

    await this.reportHistoryRepo.save(
      this.reportHistoryRepo.create({
        reportId: batch.id,
        fromStatus: oldStatus,
        toStatus: ReportStatus.CANCELLED,
        actorId: userId,
        note: reason || 'Hủy đợt báo cáo',
      }),
    );

    return { ok: true, status: batch.status };
  }

  async updateBatchCounts(batchId: string) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) return;

    const stats = await this.assignmentRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('a.batchId = :batchId', { batchId })
      .andWhere('a.isCancelled = false')
      .groupBy('a.status')
      .getRawMany();

    const counts = {
      [ReportAssignmentStatus.ASSIGNED]: 0,
      [ReportAssignmentStatus.IN_PROGRESS]: 0,
      [ReportAssignmentStatus.SUBMITTED]: 0,
      [ReportAssignmentStatus.APPROVED]: 0,
      [ReportAssignmentStatus.REJECTED]: 0,
    };

    let total = 0;
    for (const s of stats) {
      const c = parseInt(s.count);
      counts[s.status as ReportAssignmentStatus] = c;
      total += c;
    }

    batch.totalAssignments = total;
    batch.assignedCount = counts[ReportAssignmentStatus.ASSIGNED];
    batch.inProgressCount = counts[ReportAssignmentStatus.IN_PROGRESS];
    batch.submittedCount = counts[ReportAssignmentStatus.SUBMITTED];
    batch.approvedCount = counts[ReportAssignmentStatus.APPROVED];
    batch.rejectedCount = counts[ReportAssignmentStatus.REJECTED];

    if (batch.approvedCount === total && total > 0) {
      if (batch.status !== ReportStatus.COMPLETED) {
        const oldStatus = batch.status;
        batch.status = ReportStatus.COMPLETED;
        await this.reportHistoryRepo.save(
          this.reportHistoryRepo.create({
            reportId: batch.id,
            fromStatus: oldStatus,
            toStatus: ReportStatus.COMPLETED,
            actorId: '00000000-0000-0000-0000-000000000000', // System auto
            note: 'Tự động hoàn tất khi tất cả đơn vị đã duyệt',
          }),
        );
      }
    } else if (batch.status === ReportStatus.COMPLETED) {
      // Revert from COMPLETED if something changed (e.g. un-approve or new assignment)
      batch.status = ReportStatus.ASSIGNED;
    }

    await this.batchRepo.save(batch);
  }

  async addComment(assignmentId: string, authorId: string, content: string, type = 'GENERAL') {
    const a = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');

    const comment = this.commentRepo.create({
      assignmentId,
      authorId,
      content,
      commentType: type,
    });
    return await this.commentRepo.save(comment);
  }

  async getComments(assignmentId: string) {
    return await this.commentRepo.find({
      where: { assignmentId },
      order: { createdAt: 'ASC' },
    });
  }

  async getHistory(assignmentId: string) {
    return await this.assignmentHistoryRepo.find({
      where: { assignmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBatchHistory(batchId: string) {
    return await this.reportHistoryRepo.find({
      where: { reportId: batchId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateAssignmentStatus(
    id: string,
    status: ReportAssignmentStatus,
    actorId: string,
    note?: string,
  ) {
    const a = await this.assignmentRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');

    const oldStatus = a.status;
    if (oldStatus === status) return a;

    a.status = status;
    if (status === ReportAssignmentStatus.SUBMITTED) {
      a.submittedAt = new Date();
    } else if (status === ReportAssignmentStatus.APPROVED) {
      a.approvedAt = new Date();
      a.approvedBy = actorId;
    } else if (status === ReportAssignmentStatus.REJECTED) {
      a.rejectReason = note || null;
    }

    const saved = await this.assignmentRepo.save(a);

    await this.assignmentHistoryRepo.save(
      this.assignmentHistoryRepo.create({
        assignmentId: a.id,
        fromStatus: oldStatus,
        toStatus: status,
        actorId,
        note,
      }),
    );

    if (a.batchId) {
      await this.updateBatchCounts(a.batchId);
    }

    return saved;
  }

  async configureIndicatorScopes(
    batchId: string,
    dto: ConfigureAssignmentIndicatorScopesDto,
    userId: string | undefined,
  ) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt giao báo cáo');

    const allocations = dto.allocations ?? [];
    const orgIds = [...new Set(allocations.map((x) => x.orgId))];
    const indicatorIds = [
      ...new Set(allocations.flatMap((x) => x.indicatorIds ?? [])),
    ];

    const orgs = await this.orgRepo.find({
      where: { id: In(orgIds) },
      select: { id: true, isActive: true },
    });
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    for (const orgId of orgIds) {
      const org = orgMap.get(orgId);
      if (!org) throw new NotFoundException('Không tìm thấy đơn vị nhận');
      if (!org.isActive) throw new ConflictException('ASSIGNMENT_ORG_INACTIVE');
    }

    const indicators = await this.indicatorRepo.find({
      where: { id: In(indicatorIds), formId: batch.formId },
      select: { id: true },
    });
    if (indicators.length !== indicatorIds.length) {
      throw new BadRequestException('INDICATOR_NOT_IN_FORM');
    }

    await this.scopeRepo
      .createQueryBuilder()
      .delete()
      .from(AssignmentIndicatorScope)
      .where('batch_id = :batchId', { batchId })
      .andWhere('org_id IN (:...orgIds)', { orgIds })
      .execute();
    const rows: AssignmentIndicatorScope[] = [];
    for (const a of allocations) {
      for (const indicatorId of a.indicatorIds) {
        rows.push(
          this.scopeRepo.create({
            batchId,
            orgId: a.orgId,
            indicatorId,
          }),
        );
      }
    }
    await this.scopeRepo.save(rows);

    let created = 0;
    let updated = 0;
    for (const orgId of orgIds) {
      const existing = await this.assignmentRepo.findOne({
        where: {
          formId: batch.formId,
          orgId,
          periodType: batch.periodType,
          periodCode: batch.periodCode,
          isCancelled: false,
        },
      });
      if (existing) {
        const oldStatus = existing.status;
        existing.batchId = batchId;
        existing.periodName = batch.periodName;
        existing.deadlineFrom = batch.deadlineFrom;
        existing.deadlineTo = batch.deadlineTo;
        existing.assignedBy = existing.assignedBy ?? (userId ?? null);
        await this.assignmentRepo.save(existing);
        updated++;
        continue;
      }
      const newAssignment = await this.assignmentRepo.save(
        this.assignmentRepo.create({
          batchId,
          formId: batch.formId,
          orgId,
          periodType: batch.periodType,
          periodCode: batch.periodCode,
          periodName: batch.periodName,
          deadlineFrom: batch.deadlineFrom,
          deadlineTo: batch.deadlineTo,
          status: ReportAssignmentStatus.ASSIGNED,
          isCancelled: false,
          cancelReason: null,
          autoAssign: false,
          assignedBy: userId ?? null,
        }),
      );
      
      // Log history for new assignment
      await this.assignmentHistoryRepo.save(
        this.assignmentHistoryRepo.create({
          assignmentId: newAssignment.id,
          fromStatus: null,
          toStatus: ReportAssignmentStatus.ASSIGNED,
          actorId: userId ?? '00000000-0000-0000-0000-000000000000',
          note: 'Giao báo cáo mới',
        }),
      );
      created++;
    }

    // Update batch aggregate counts
    const total = await this.assignmentRepo.count({
      where: { batchId, isCancelled: false },
    });
    batch.totalAssignments = total;
    batch.assignedCount = total; // Initially all are ASSIGNED status
    await this.batchRepo.save(batch);

    return {
      ok: true as const,
      batchId,
      totalAssignments: total,
      scopesInserted: rows.length,
      assignments: { created, updated },
    };
  }

  async cancel(id: string, reason?: string) {
    const a = await this.assignmentRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    if (a.isCancelled) return { ok: true };
    a.isCancelled = true;
    a.cancelReason = reason?.trim() ?? null;
    await this.assignmentRepo.save(a);

    if (a.batchId) {
      await this.updateBatchCounts(a.batchId);
    }
    return { ok: true };
  }

  async nextPeriod(dto: NextPeriodAssignmentsDto) {
    const confirm = dto.confirm === true;
    const fromRows = await this.assignmentRepo.find({
      where: {
        formId: dto.formId,
        periodType: dto.fromPeriodType,
        periodCode: dto.fromPeriodCode.trim(),
        isCancelled: false,
      },
    });
    if (!confirm) {
      return {
        preview: true,
        wouldCreate: fromRows.length,
        fromPeriod: {
          periodType: dto.fromPeriodType,
          periodCode: dto.fromPeriodCode.trim(),
        },
        toPeriod: {
          periodType: dto.toPeriodType,
          periodCode: dto.toPeriodCode.trim(),
        },
        formId: dto.formId,
      };
    }
    let created = 0;
    const toPeriodCode = dto.toPeriodCode.trim();
    for (const r of fromRows) {
      const exists = await this.assignmentRepo.exist({
        where: {
          formId: dto.formId,
          orgId: r.orgId,
          periodType: dto.toPeriodType,
          periodCode: toPeriodCode,
          isCancelled: false,
        },
      });
      if (exists) continue;
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
          formId: r.formId,
          orgId: r.orgId,
          periodType: dto.toPeriodType,
          periodCode: toPeriodCode,
          periodName: r.periodName,
          deadlineFrom: r.deadlineFrom,
          deadlineTo: r.deadlineTo,
          isCancelled: false,
          assignedBy: r.assignedBy,
        }),
      );
      created++;
    }
    return { ok: true, created };
  }
}
