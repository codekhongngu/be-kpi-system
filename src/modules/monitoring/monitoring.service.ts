import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormAssignment } from '../assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { MonitoringQueryDto } from './dto/monitoring-query.dto';
import { SendRemindersDto } from './dto/send-reminders.dto';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async listReports(user: User, query: MonitoringQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoin(ReportSubmission, 's', 's.assignmentId = a.id')
      .innerJoin('organizations', 'o', 'o.id = a.orgId')
      .innerJoin('forms', 'f', 'f.id = a.formId')
      .innerJoin('report_periods', 'p', 'p.id = a.periodId')
      .where('a.isCancelled = false');

    if (user.orgId) {
      qb.andWhere('a.orgId = :userOrg', { userOrg: user.orgId });
    }
    if (query.orgId) qb.andWhere('a.orgId = :orgId', { orgId: query.orgId });
    if (query.formId)
      qb.andWhere('a.formId = :formId', { formId: query.formId });
    if (query.periodId)
      qb.andWhere('a.periodId = :periodId', { periodId: query.periodId });
    if (query.status) {
      qb.andWhere('COALESCE(s.status, :draft) = :st', {
        st: query.status,
        draft: 'DRAFT',
      });
    }

    qb.select([
      'o.id AS "orgId"',
      'o.code AS "orgCode"',
      'o.name AS "orgName"',
      'f.id AS "formId"',
      'f.code AS "formCode"',
      'f.name AS "formName"',
      'p.id AS "periodId"',
      'p.code AS "periodCode"',
      'p.name AS "periodName"',
      'a.id AS "assignmentId"',
      's.id AS "submissionId"',
      'COALESCE(s.status, :draft2) AS "status"',
      's.completion_pct AS "completionPct"',
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
      .where('a.isCancelled = false');
    if (user.orgId)
      countQb.andWhere('a.orgId = :userOrg', { userOrg: user.orgId });
    if (query.orgId)
      countQb.andWhere('a.orgId = :orgId', { orgId: query.orgId });
    if (query.formId)
      countQb.andWhere('a.formId = :formId', { formId: query.formId });
    if (query.periodId)
      countQb.andWhere('a.periodId = :periodId', { periodId: query.periodId });
    if (query.status) {
      countQb.andWhere('COALESCE(s.status, :draft) = :st', {
        st: query.status,
        draft: 'DRAFT',
      });
    }
    const total = await countQb.getCount();

    const items = rows.map((r) => ({
      org: { id: r.orgId, code: r.orgCode, name: r.orgName },
      form: { id: r.formId, code: r.formCode, name: r.formName },
      period: { id: r.periodId, code: r.periodCode, name: r.periodName },
      assignmentId: r.assignmentId,
      submissionId: r.submissionId,
      status: r.status,
      completionPct: r.completionPct != null ? Number(r.completionPct) : null,
      deadlineTo: r.deadlineTo,
    }));
    return { items, meta: { page, limit, total } };
  }

  async sendReminders(dto: SendRemindersDto) {
    const assignments = await this.assignmentRepo.find({
      where: { id: In(dto.assignmentIds) },
    });

    const orgIds = [...new Set(assignments.map((a) => a.orgId))];
    if (orgIds.length === 0) return { sent: 0 };

    const users = await this.userRepo.find({
      where: { orgId: In(orgIds), status: UserStatus.ACTIVE },
      select: { id: true, orgId: true },
    });

    const usersByOrg = new Map<string, string[]>();
    for (const u of users) {
      if (!u.orgId) continue;
      if (!usersByOrg.has(u.orgId)) usersByOrg.set(u.orgId, []);
      usersByOrg.get(u.orgId)!.push(u.id);
    }

    const now = new Date();
    let sent = 0;
    for (const a of assignments) {
      const targetUserIds = usersByOrg.get(a.orgId) ?? [];
      if (targetUserIds.length === 0) continue;

      const title = 'Nhắc nộp báo cáo';
      const body =
        dto.message?.trim() ||
        `Bạn có báo cáo được giao (assignmentId=${a.id}) sắp đến hạn hoặc quá hạn. Vui lòng kiểm tra và nộp đúng hạn.`;

      const rows = targetUserIds.map((userId) =>
        this.notificationRepo.create({
          userId,
          type: 'REMINDER',
          title,
          body,
          channel: 'IN_APP',
          isRead: false,
          refTable: 'form_assignments',
          refId: null,
          status: 'PENDING',
          retryCount: 0,
          sentAt: null,
          createdAt: now,
        }),
      );

      await this.notificationRepo.save(rows);
      sent += rows.length;
    }

    return { sent };
  }
}
