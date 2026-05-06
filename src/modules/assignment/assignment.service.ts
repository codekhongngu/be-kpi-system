import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormAssignment } from './entities/form-assignment.entity';
import { AssignmentBatch } from './entities/assignment-batch.entity';
import { AssignmentIndicatorScope } from './entities/assignment-indicator-scope.entity';
import { Form } from '../form-designer/entities/form.entity';
import { FormIndicator } from '../form-designer/entities/form-indicator.entity';
import { Organization } from '../organization/entities/organization.entity';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';
import { NextPeriodAssignmentsDto } from './dto/next-period-assignments.dto';
import { ConfigureAssignmentIndicatorScopesDto } from './dto/configure-assignment-indicator-scopes.dto';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(AssignmentBatch)
    private readonly batchRepo: Repository<AssignmentBatch>,
    @InjectRepository(AssignmentIndicatorScope)
    private readonly scopeRepo: Repository<AssignmentIndicatorScope>,
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormIndicator)
    private readonly indicatorRepo: Repository<FormIndicator>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async findAll(query: AssignmentQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;
    const qb = this.assignmentRepo.createQueryBuilder('a');
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
        periodType: dto.periodType,
        periodCode,
        periodName,
        deadlineFrom: dto.deadlineFrom.slice(0, 10),
        deadlineTo: dto.deadlineTo.slice(0, 10),
        createdBy: userId ?? null,
      }),
    );
    return {
      id: batch.id,
      formId: batch.formId,
      periodType: batch.periodType,
      periodCode: batch.periodCode,
      periodName: batch.periodName,
      deadlineFrom: batch.deadlineFrom,
      deadlineTo: batch.deadlineTo,
    };
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
        existing.batchId = batchId;
        existing.periodName = batch.periodName;
        existing.deadlineFrom = batch.deadlineFrom;
        existing.deadlineTo = batch.deadlineTo;
        existing.assignedBy = existing.assignedBy ?? (userId ?? null);
        await this.assignmentRepo.save(existing);
        updated++;
        continue;
      }
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
          batchId,
          formId: batch.formId,
          orgId,
          periodType: batch.periodType,
          periodCode: batch.periodCode,
          periodName: batch.periodName,
          deadlineFrom: batch.deadlineFrom,
          deadlineTo: batch.deadlineTo,
          isCancelled: false,
          cancelReason: null,
          autoAssign: false,
          assignedBy: userId ?? null,
        }),
      );
      created++;
    }

    return {
      ok: true as const,
      batchId,
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
