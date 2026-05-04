import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormAssignment } from './entities/form-assignment.entity';
import { Form } from '../form-designer/entities/form.entity';
import { Organization } from '../organization/entities/organization.entity';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';
import { NextPeriodAssignmentsDto } from './dto/next-period-assignments.dto';

function parseDateOnly(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Ngày không hợp lệ');
  return d;
}

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
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
    if (query.from) {
      qb.andWhere('a.periodTo >= :from', { from: query.from.slice(0, 10) });
    }
    if (query.to) {
      qb.andWhere('a.periodFrom <= :to', { to: query.to.slice(0, 10) });
    }
    if (query.orgId) qb.andWhere('a.orgId = :orgId', { orgId: query.orgId });
    if (query.isCancelled !== undefined) {
      qb.andWhere('a.isCancelled = :ic', { ic: query.isCancelled });
    }
    qb.orderBy('a.assignedAt', 'DESC').skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async createBulk(dto: CreateAssignmentsDto, userId: string | undefined) {
    const form = await this.formRepo.findOne({ where: { id: dto.formId } });
    if (!form) throw new NotFoundException('Không tìm thấy biểu mẫu');
    if (!form.isActive) throw new ConflictException('ASSIGNMENT_FORM_INACTIVE');

    const pFrom = parseDateOnly(dto.periodFrom);
    const pTo = parseDateOnly(dto.periodTo);
    if (pTo.getTime() < pFrom.getTime()) {
      throw new BadRequestException('PERIOD_INVALID_RANGE');
    }

    let created = 0;
    let skipped = 0;
    const duplicates: Array<{ orgId: string; reason: string }> = [];

    const periodFrom = dto.periodFrom.slice(0, 10);
    const periodTo = dto.periodTo.slice(0, 10);
    const periodCode = dto.periodCode?.trim() || null;
    const periodName = dto.periodName?.trim() || null;

    for (const orgId of dto.orgIds) {
      const org = await this.orgRepo.findOne({ where: { id: orgId } });
      if (!org) {
        duplicates.push({ orgId, reason: 'ORG_NOT_FOUND' });
        skipped++;
        continue;
      }
      if (!org.isActive) {
        duplicates.push({ orgId, reason: 'ASSIGNMENT_ORG_INACTIVE' });
        skipped++;
        continue;
      }
      const exists = await this.assignmentRepo.exist({
        where: {
          formId: dto.formId,
          orgId,
          periodType: dto.periodType,
          periodFrom,
          periodTo,
          isCancelled: false,
        },
      });
      if (exists) {
        duplicates.push({ orgId, reason: 'ASSIGNMENT_DUPLICATE' });
        skipped++;
        continue;
      }
      const row = this.assignmentRepo.create({
        formId: dto.formId,
        orgId,
        periodType: dto.periodType,
        periodFrom,
        periodTo,
        periodCode,
        periodName,
        deadlineFrom: dto.deadlineFrom.slice(0, 10),
        deadlineTo: dto.deadlineTo.slice(0, 10),
        isCancelled: false,
        cancelReason: null,
        autoAssign: false,
        assignedBy: userId ?? null,
      });
      await this.assignmentRepo.save(row);
      created++;
    }
    return { created, skipped, duplicates };
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
        periodFrom: dto.fromPeriodFrom.slice(0, 10),
        periodTo: dto.fromPeriodTo.slice(0, 10),
        isCancelled: false,
      },
    });
    if (!confirm) {
      return {
        preview: true,
        wouldCreate: fromRows.length,
        fromPeriod: {
          periodType: dto.fromPeriodType,
          periodFrom: dto.fromPeriodFrom.slice(0, 10),
          periodTo: dto.fromPeriodTo.slice(0, 10),
        },
        toPeriod: {
          periodType: dto.toPeriodType,
          periodFrom: dto.toPeriodFrom.slice(0, 10),
          periodTo: dto.toPeriodTo.slice(0, 10),
        },
        formId: dto.formId,
      };
    }
    let created = 0;
    const toPeriodFrom = dto.toPeriodFrom.slice(0, 10);
    const toPeriodTo = dto.toPeriodTo.slice(0, 10);
    for (const r of fromRows) {
      const exists = await this.assignmentRepo.exist({
        where: {
          formId: dto.formId,
          orgId: r.orgId,
          periodType: dto.toPeriodType,
          periodFrom: toPeriodFrom,
          periodTo: toPeriodTo,
          isCancelled: false,
        },
      });
      if (exists) continue;
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
          formId: r.formId,
          orgId: r.orgId,
          periodType: dto.toPeriodType,
          periodFrom: toPeriodFrom,
          periodTo: toPeriodTo,
          periodCode: r.periodCode,
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
