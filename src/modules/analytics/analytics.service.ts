import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { User } from '../user/entities/user.entity';
import { PivotRequestDto } from './dto/pivot-request.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
  ) {}

  async kpis(user: User, from: string, to: string, orgId?: string) {
    const org = orgId ?? user.orgId ?? undefined;
    const qbA = this.assignmentRepo
      .createQueryBuilder('a')
      .where('a.is_cancelled = false')
      .andWhere('a.deadline_to >= :from', { from: from.slice(0, 10) })
      .andWhere('a.deadline_to <= :to', { to: to.slice(0, 10) });
    if (org) qbA.andWhere('a.org_id = :org', { org });
    const assigned = await qbA.getCount();

    const qbS = this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin(FormAssignment, 'a', 'a.id = s.assignment_id')
      .where('a.is_cancelled = false')
      .andWhere('a.deadline_to >= :from', { from: from.slice(0, 10) })
      .andWhere('a.deadline_to <= :to', { to: to.slice(0, 10) });
    if (org) qbS.andWhere('a.org_id = :org', { org });

    const submitted = await qbS
      .clone()
      .andWhere('s.status IN (:...sub)', {
        sub: ['PENDING', 'APPROVED', 'REJECTED'],
      })
      .getCount();
    const approved = await qbS
      .clone()
      .andWhere('s.status = :st', { st: 'APPROVED' })
      .getCount();
    const overdue = await qbS
      .clone()
      .andWhere('a.deadline_to < CURRENT_DATE')
      .andWhere('s.status IN (:...open)', { open: ['DRAFT', 'REJECTED'] })
      .getCount();

    return { assigned, submitted, approved, overdue };
  }

  async charts() {
    return {
      series: [] as { name: string; points: { x: string; y: number }[] }[],
    };
  }

  async pivot(_dto: PivotRequestDto) {
    return { header: [], rows: [] as unknown[] };
  }

  async export(_format: string) {
    return { downloadUrl: '', expiresInSeconds: 3600 };
  }
}
