import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSummary } from './entities/report-summary.entity';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';

@Injectable()
export class SummaryAnalyticsSummaryService {
  constructor(
    @InjectRepository(ReportSummary)
    private readonly summaryRepo: Repository<ReportSummary>,
  ) {}

  async findAll(query: SummaryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;
    const qb = this.summaryRepo.createQueryBuilder('s');
    if (query.formId)
      qb.andWhere('s.form_id = :formId', { formId: query.formId });
    if (query.periodType)
      qb.andWhere('s.period_type = :periodType', {
        periodType: query.periodType,
      });
    if (query.from) {
      qb.andWhere('s.period_to >= :pFrom', { pFrom: query.from.slice(0, 10) });
    }
    if (query.to) {
      qb.andWhere('s.period_from <= :pTo', { pTo: query.to.slice(0, 10) });
    }
    if (query.orgId) qb.andWhere('s.org_id = :orgId', { orgId: query.orgId });
    qb.orderBy('s.created_at', 'DESC').skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((x) => ({
        id: x.id,
        formId: x.formId,
        period: {
          type: x.periodType,
          code: x.periodCode,
          name: x.periodName,
          dateFrom: x.periodFrom,
          dateTo: x.periodTo,
        },
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
      periodType: dto.periodType,
      periodFrom: dto.periodFrom.slice(0, 10),
      periodTo: dto.periodTo.slice(0, 10),
      periodCode: dto.periodCode?.trim() || null,
      periodName: dto.periodName?.trim() || null,
      orgId: dto.orgId,
      status: 'DRAFT',
      summaryData: {
        indicators: {},
        note: 'Tong hop toi thieu - mo rong theo rule cha-con sau',
      },
      summarizedBy: userId ?? null,
      summarizedAt: new Date(),
    });
    const saved = await this.summaryRepo.save(row);
    return await this.findOne(saved.id);
  }

  async findOne(id: string) {
    const s = await this.summaryRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Khong tim thay ban tong hop');
    return {
      id: s.id,
      formId: s.formId,
      period: {
        type: s.periodType,
        code: s.periodCode,
        name: s.periodName,
        dateFrom: s.periodFrom,
        dateTo: s.periodTo,
      },
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
    if (!s) throw new NotFoundException('Khong tim thay ban tong hop');
    s.summaryData = {
      ...(s.summaryData ?? {}),
      recomputedAt: new Date().toISOString(),
    };
    await this.summaryRepo.save(s);
    return { ok: true as const };
  }
}
