import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { ReportSummary } from '../summary/entities/report-summary.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ReportPeriod } from '../report-period/entities/report-period.entity';
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
    @InjectRepository(ReportPeriod)
    private readonly periodRepo: Repository<ReportPeriod>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getOverview(query: DashboardQueryDto) {
    const { organizationId, periodId, from, to } = query;

    const assignmentQb = this.assignmentRepo.createQueryBuilder('a');
    const submissionQb = this.submissionRepo.createQueryBuilder('s');
    const summaryQb = this.summaryRepo.createQueryBuilder('r');

    if (organizationId) {
      assignmentQb.andWhere('a.organizationId = :organizationId', {
        organizationId,
      });
      submissionQb.andWhere('s.organizationId = :organizationId', {
        organizationId,
      });
      summaryQb.andWhere('r.organizationId = :organizationId', {
        organizationId,
      });
    }
    if (periodId) {
      assignmentQb.andWhere('a.periodId = :periodId', { periodId });
      submissionQb.andWhere('s.periodId = :periodId', { periodId });
      summaryQb.andWhere('r.periodId = :periodId', { periodId });
    }
    if (from) {
      assignmentQb.andWhere('a.deadline >= :from', { from });
      submissionQb.andWhere('s.submittedAt >= :from', { from });
    }
    if (to) {
      assignmentQb.andWhere('a.deadline <= :to', { to });
      submissionQb.andWhere('s.submittedAt <= :to', { to });
    }

    const [totalAssignments, assignedCount] = await assignmentQb
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE a.status = 'ASSIGNED')", 'assigned')
      .getRawOne();

    const [totalSubmissions, submittedCount] = await submissionQb
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE s.status = 'SUBMITTED')", 'submitted')
      .getRawOne();

    const [totalSummaries, approvedSummaries] = await summaryQb
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE r.status = 'APPROVED')", 'approved')
      .getRawOne();

    const totalOrgs = await this.orgRepo.count();
    const totalPeriods = await this.periodRepo.count();
    const totalUsers = await this.userRepo.count();

    const overdueAssignments = await assignmentQb
      .andWhere('a.deadline < NOW()')
      .andWhere("a.status = 'ASSIGNED'")
      .getCount();

    return {
      organizations: totalOrgs,
      periods: totalPeriods,
      users: totalUsers,
      assignments: {
        total: Number(totalAssignments) || 0,
        assigned: Number(assignedCount) || 0,
        overdue: overdueAssignments,
      },
      submissions: {
        total: Number(totalSubmissions) || 0,
        submitted: Number(submittedCount) || 0,
      },
      summaries: {
        total: Number(totalSummaries) || 0,
        approved: Number(approvedSummaries) || 0,
      },
    };
  }

  async getSubmissionTrends(query: DashboardQueryDto) {
    const { organizationId, periodId } = query;

    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .select("DATE_TRUNC('day', s.submittedAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('s.submittedAt IS NOT NULL');

    if (organizationId) {
      qb.andWhere('s.organizationId = :organizationId', { organizationId });
    }
    if (periodId) {
      qb.andWhere('s.periodId = :periodId', { periodId });
    }

    return await qb
      .groupBy("DATE_TRUNC('day', s.submittedAt)")
      .orderBy('date', 'ASC')
      .limit(30)
      .getRawMany();
  }
}
