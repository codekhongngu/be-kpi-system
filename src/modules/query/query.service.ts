import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { User } from '../user/entities/user.entity';
import { QueryReportsDto } from './dto/query-reports.dto';

@Injectable()
export class QueryService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
  ) {}

  async listReports(user: User, query: QueryReportsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoin(ReportSubmission, 's', 's.assignmentId = a.id')
      .innerJoin('organizations', 'o', 'o.id = a.orgId')
      .innerJoin('forms', 'f', 'f.id = a.formId')
      .where('a.isCancelled = false');

    if (user.orgId) {
      qb.andWhere('a.orgId = :userOrg', { userOrg: user.orgId });
    }
    if (query.orgId) qb.andWhere('a.orgId = :orgId', { orgId: query.orgId });
    if (query.formId)
      qb.andWhere('a.formId = :formId', { formId: query.formId });
    if (query.periodType)
      qb.andWhere('a.periodType = :periodType', { periodType: query.periodType });
    if (query.periodFrom) {
      qb.andWhere('a.periodTo >= :pFrom', { pFrom: query.periodFrom.slice(0, 10) });
    }
    if (query.periodTo) {
      qb.andWhere('a.periodFrom <= :pTo', { pTo: query.periodTo.slice(0, 10) });
    }
    if (query.status) {
      qb.andWhere('COALESCE(s.status, :draft) = :st', {
        st: query.status,
        draft: 'DRAFT',
      });
    }
    if (query.deadlineFrom) {
      qb.andWhere('a.deadlineTo >= :df', {
        df: query.deadlineFrom.slice(0, 10),
      });
    }
    if (query.deadlineTo) {
      qb.andWhere('a.deadlineTo <= :dt', { dt: query.deadlineTo.slice(0, 10) });
    }
    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(f.name) LIKE :q OR LOWER(f.code) LIKE :q OR LOWER(s.code) LIKE :q)',
        { q },
      );
    }

    qb.select([
      's.id AS "submissionId"',
      'a.id AS "assignmentId"',
      'o.id AS "orgId"',
      'o.code AS "orgCode"',
      'o.name AS "orgName"',
      'f.id AS "formId"',
      'f.code AS "formCode"',
      'f.name AS "formName"',
      'a.periodType AS "periodType"',
      'a.periodFrom AS "periodFrom"',
      'a.periodTo AS "periodTo"',
      'a.periodCode AS "periodCode"',
      'a.periodName AS "periodName"',
      'COALESCE(s.status, :draft2) AS "status"',
      's.completion_pct AS "completionPct"',
      's.submitted_at AS "submittedAt"',
      's.approved_at AS "approvedAt"',
      'a.deadlineTo AS "deadlineTo"',
    ])
      .setParameter('draft2', 'DRAFT')
      .orderBy('a.deadlineTo', 'ASC')
      .skip(skip)
      .take(limit);

    const rows = await qb.getRawMany();

    const countQb = this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoin(ReportSubmission, 's', 's.assignmentId = a.id')
      .innerJoin('forms', 'f', 'f.id = a.formId')
      .where('a.isCancelled = false');
    if (user.orgId)
      countQb.andWhere('a.orgId = :userOrg', { userOrg: user.orgId });
    if (query.orgId)
      countQb.andWhere('a.orgId = :orgId', { orgId: query.orgId });
    if (query.formId)
      countQb.andWhere('a.formId = :formId', { formId: query.formId });
    if (query.periodType)
      countQb.andWhere('a.periodType = :periodType', { periodType: query.periodType });
    if (query.periodFrom) {
      countQb.andWhere('a.periodTo >= :pFrom', { pFrom: query.periodFrom.slice(0, 10) });
    }
    if (query.periodTo) {
      countQb.andWhere('a.periodFrom <= :pTo', { pTo: query.periodTo.slice(0, 10) });
    }
    if (query.status) {
      countQb.andWhere('COALESCE(s.status, :draft) = :st', {
        st: query.status,
        draft: 'DRAFT',
      });
    }
    if (query.deadlineFrom) {
      countQb.andWhere('a.deadlineTo >= :df', {
        df: query.deadlineFrom.slice(0, 10),
      });
    }
    if (query.deadlineTo) {
      countQb.andWhere('a.deadline_to <= :dt', {
        dt: query.deadlineTo.slice(0, 10),
      });
    }
    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      countQb.andWhere(
        '(LOWER(f.name) LIKE :q OR LOWER(f.code) LIKE :q OR LOWER(s.code) LIKE :q)',
        { q },
      );
    }
    const total = await countQb.getCount();

    const items = rows.map((r) => ({
      submissionId: r.submissionId,
      assignmentId: r.assignmentId,
      org: { id: r.orgId, code: r.orgCode, name: r.orgName },
      form: { id: r.formId, code: r.formCode, name: r.formName },
      period: {
        type: r.periodType,
        code: r.periodCode,
        name: r.periodName,
        dateFrom: r.periodFrom,
        dateTo: r.periodTo,
      },
      status: r.status,
      completionPct: r.completionPct != null ? Number(r.completionPct) : null,
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      deadlineTo: r.deadlineTo,
    }));
    return { items, meta: { page, limit, total } };
  }

  async reportDetail(submissionId: string, user: User) {
    const s = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
    const a = await this.assignmentRepo.findOne({
      where: { id: s.assignmentId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy giao việc');
    if (user.orgId && a.orgId !== user.orgId) {
      throw new NotFoundException('Không tìm thấy bản nộp');
    }
    return {
      submissionId: s.id,
      assignmentId: a.id,
      status: s.status,
      note: s.note,
      rejectReason: s.rejectReason,
      completionPct: s.completionPct != null ? Number(s.completionPct) : null,
      submittedAt: s.submittedAt,
      approvedAt: s.approvedAt,
      deadlineTo: a.deadlineTo,
    };
  }

  async exportReport(_submissionId: string, _format: string) {
    return { downloadUrl: '', expiresInSeconds: 3600 };
  }
}
