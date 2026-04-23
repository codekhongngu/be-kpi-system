import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSummary } from './entities/report-summary.entity';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';

@Injectable()
export class SummaryService {
  constructor(
    @InjectRepository(ReportSummary)
    private readonly summaryRepo: Repository<ReportSummary>,
  ) {}

  async findAll(query: SummaryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;
    const qb = this.summaryRepo.createQueryBuilder('s');
    if (query.formId) qb.andWhere('s.form_id = :formId', { formId: query.formId });
    if (query.periodId) qb.andWhere('s.period_id = :periodId', { periodId: query.periodId });
    if (query.orgId) qb.andWhere('s.org_id = :orgId', { orgId: query.orgId });
    qb.orderBy('s.created_at', 'DESC').skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((x) => ({
        id: x.id,
        formId: x.formId,
        periodId: x.periodId,
        orgId: x.orgId,
        status: x.status,
        summarizedAt: x.summarizedAt,
      })),
      meta: { page, limit, total },
    };
  }

  async create(dto: CreateSummaryDto, userId: string | undefined) {
    const row = this.summaryRepo.create({
      formId: dto.formId,
      periodId: dto.periodId,
      orgId: dto.orgId,
      status: 'DRAFT',
      summaryData: { indicators: {}, note: 'Tổng hợp tối thiểu — mở rộng theo rule cha–con sau' },
      summarizedBy: userId ?? null,
      summarizedAt: new Date(),
    });
    const saved = await this.summaryRepo.save(row);
    return await this.findOne(saved.id);
  }

  async findOne(id: string) {
    const s = await this.summaryRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản tổng hợp');
    return {
      id: s.id,
      formId: s.formId,
      periodId: s.periodId,
      orgId: s.orgId,
      status: s.status,
      totalUnits: s.totalUnits,
      submittedUnits: s.submittedUnits,
      approvedUnits: s.approvedUnits,
      summaryData: s.summaryData,
      summarizedAt: s.summarizedAt,
    };
  }

  async recompute(id: string) {
    const s = await this.summaryRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy bản tổng hợp');
    s.summaryData = {
      ...(s.summaryData ?? {}),
      recomputedAt: new Date().toISOString(),
    };
    await this.summaryRepo.save(s);
    return { ok: true as const };
  }
}
