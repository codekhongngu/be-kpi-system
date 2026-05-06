import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { ReportSummary } from '../summary/entities/report-summary.entity';
import { Organization } from '../organization/entities/organization.entity';
import { User } from '../user/entities/user.entity';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
    @InjectRepository(ReportSummary)
    private readonly summaryRepo: Repository<ReportSummary>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getOverview(query: DashboardQueryDto) {
    const { organizationId, periodType, from, to } = query;

    const assignmentQb = this.assignmentRepo
      .createQueryBuilder('a')
      .where('a.isCancelled = false');
    if (organizationId)
      assignmentQb.andWhere('a.orgId = :orgId', { orgId: organizationId });
    if (periodType)
      assignmentQb.andWhere('a.periodType = :periodType', { periodType });
    if (from) assignmentQb.andWhere('a.deadlineTo >= :from', { from: from.slice(0, 10) });
    if (to) assignmentQb.andWhere('a.deadlineTo <= :to', { to: to.slice(0, 10) });

    const totalAssignments = await assignmentQb.getCount();
    const overdueAssignments = await assignmentQb
      .clone()
      .andWhere('a.deadlineTo < CURRENT_DATE')
      .getCount();

    const submissionQb = this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin(FormAssignment, 'a', 'a.id = s.assignment_id')
      .where('a.is_cancelled = false');
    if (organizationId)
      submissionQb.andWhere('a.org_id = :orgId', { orgId: organizationId });
    if (periodType)
      submissionQb.andWhere('a.period_type = :periodType', { periodType });
    if (from)
      submissionQb.andWhere('a.deadline_to >= :from', { from: from.slice(0, 10) });
    if (to)
      submissionQb.andWhere('a.deadline_to <= :to', { to: to.slice(0, 10) });

    const totalSubmissions = await submissionQb.getCount();
    const submittedCount = await submissionQb
      .clone()
      .andWhere("s.status IN (:...st)", {
        st: ['PENDING', 'APPROVED', 'REJECTED'],
      })
      .getCount();

    const summaryQb = this.summaryRepo.createQueryBuilder('r');
    if (organizationId) summaryQb.andWhere('r.orgId = :orgId', { orgId: organizationId });
    if (periodType) summaryQb.andWhere('r.periodType = :periodType', { periodType });
    if (from) summaryQb.andWhere('r.periodTo >= :from', { from: from.slice(0, 10) });
    if (to) summaryQb.andWhere('r.periodFrom <= :to', { to: to.slice(0, 10) });

    const totalSummaries = await summaryQb.getCount();
    const approvedSummaries = await summaryQb
      .clone()
      .andWhere("r.status = 'APPROVED'")
      .getCount();

    const totalOrgs = await this.orgRepo.count();
    const totalUsers = await this.userRepo.count();
    const totalPeriodsRows = await this.assignmentRepo.query(`
      SELECT COUNT(*)::int AS "total"
      FROM (
        SELECT DISTINCT a.period_type, a.period_code
        FROM form_assignments a
        WHERE a.is_cancelled = false
      ) x
    `);
    const totalPeriods = Number(totalPeriodsRows?.[0]?.total ?? 0);

    return {
      organizations: totalOrgs,
      periods: totalPeriods,
      users: totalUsers,
      assignments: {
        total: totalAssignments,
        assigned: totalAssignments,
        overdue: overdueAssignments,
      },
      submissions: {
        total: totalSubmissions,
        submitted: submittedCount,
      },
      summaries: {
        total: totalSummaries,
        approved: approvedSummaries,
      },
    };
  }

  async getSubmissionTrends(query: DashboardQueryDto) {
    const { organizationId, periodType } = query;

    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin(FormAssignment, 'a', 'a.id = s.assignment_id')
      .select("DATE_TRUNC('day', s.submittedAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('s.submittedAt IS NOT NULL')
      .andWhere('a.is_cancelled = false');

    if (organizationId) qb.andWhere('a.org_id = :orgId', { orgId: organizationId });
    if (periodType) qb.andWhere('a.period_type = :periodType', { periodType });

    return await qb
      .groupBy("DATE_TRUNC('day', s.submittedAt)")
      .orderBy('date', 'ASC')
      .limit(30)
      .getRawMany();
  }
}
