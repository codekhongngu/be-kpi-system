import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReportSummary } from './entities/report-summary.entity';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';

type SummaryMergeValue = {
  valueText: string | null;
  valueNumber: number | null;
};

@Injectable()
export class SummaryAnalyticsSummaryService {
  constructor(
    @InjectRepository(ReportSummary)
    private readonly summaryRepo: Repository<ReportSummary>,
    private readonly dataSource: DataSource,
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
    const campaigns = (await this.dataSource.query(
      `SELECT id FROM report_campaigns WHERE template_id = $1 AND period_type = $2 AND period_code = $3 LIMIT 1`,
      [dto.formId, dto.periodType, dto.periodCode],
    )) as unknown as Array<{ id: string }>;
    const campaignId = campaigns[0]?.id;
    if (campaignId) {
      const readiness = await this.getCampaignReadiness(campaignId);
      if (!readiness.canAggregate) {
        throw new ConflictException('CAMPAIGN_NOT_READY_FOR_SUMMARY');
      }
    }

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

    let defaultValues: Array<{
      indicator_id: string;
      attribute_id: string;
      value_text: string | null;
      value_number: string | number | null;
    }> = [];
    let submissionCells: Array<{
      indicator_id: string;
      attribute_id: string;
      value: string | null;
      value_numeric: string | number | null;
    }> = [];

    const campaigns = (await this.dataSource.query(
      `SELECT id FROM report_campaigns WHERE template_id = $1 AND period_type = $2 AND period_code = $3 LIMIT 1`,
      [s.formId, s.periodType, s.periodCode],
    )) as unknown as Array<{ id: string }>;
    const campaignId = campaigns[0]?.id;

    if (campaignId) {
      const readiness = await this.getCampaignReadiness(campaignId);
      if (!readiness.canAggregate) {
        throw new ConflictException('CAMPAIGN_NOT_READY_FOR_SUMMARY');
      }

      defaultValues = (await this.dataSource.query(
        `SELECT indicator_id, attribute_id, value_text, value_number
         FROM report_campaign_default_values
         WHERE campaign_id = $1`,
        [campaignId],
      )) as unknown as Array<{
        indicator_id: string;
        attribute_id: string;
        value_text: string | null;
        value_number: string | number | null;
      }>;

      // Fetch approved submission cells within the org tree
      submissionCells = (await this.dataSource.query(
        `SELECT c.indicator_id, c.attribute_id, c.value, c.value_numeric
         FROM report_submission_cells c
         INNER JOIN report_submissions sub ON sub.id = c.submission_id
         INNER JOIN report_assignments a ON a.id = sub.assignment_id
         WHERE a.batch_id = $1 AND a.is_cancelled = false AND sub.status IN ('DISTRICT_APPROVED', 'APPROVED')`,
        [campaignId],
      )) as unknown as Array<{
        indicator_id: string;
        attribute_id: string;
        value: string | null;
        value_numeric: string | number | null;
      }>;
    }

    const mergedData = new Map<string, SummaryMergeValue>();

    // 1. Dùng giá trị từ đơn vị (submission_cells) - Cộng dồn nếu là số
    for (const cell of submissionCells) {
      const key = `${cell.indicator_id}:${cell.attribute_id}`;
      const existing = mergedData.get(key) || {
        valueText: null,
        valueNumber: 0,
      };
      const existingValueNumber = existing.valueNumber ?? 0;
      mergedData.set(key, {
        valueText: cell.value ?? existing.valueText,
        valueNumber:
          existingValueNumber +
          (cell.value_numeric != null ? Number(cell.value_numeric) : 0),
      });
    }

    // 2. Dùng giá trị từ campaign (defaultValue ưu tiên đè lên, vì ô này locked)
    for (const dv of defaultValues) {
      const key = `${dv.indicator_id}:${dv.attribute_id}`;
      mergedData.set(key, {
        valueText: dv.value_text,
        valueNumber: dv.value_number != null ? Number(dv.value_number) : null,
      });
    }

    const indicators: Record<string, SummaryMergeValue> = {};
    for (const [key, val] of mergedData.entries()) {
      indicators[key] = val;
    }

    s.summaryData = {
      ...(s.summaryData ?? {}),
      indicators,
      recomputedAt: new Date().toISOString(),
    };
    await this.summaryRepo.save(s);
    return { ok: true as const };
  }

  private async getCampaignReadiness(campaignId: string) {
    const rows = (await this.dataSource.query(
      `SELECT a.id AS "assignmentId",
              a.org_id AS "orgId",
              o.name AS "orgName",
              s.id AS "submissionId",
              s.status AS "status",
              s.updated_at AS "updatedAt"
       FROM report_assignments a
       INNER JOIN organizations o ON o.id = a.org_id
       LEFT JOIN report_submissions s ON s.assignment_id = a.id
       WHERE a.batch_id = $1
         AND a.is_cancelled = false
       ORDER BY o.name ASC`,
      [campaignId],
    )) as unknown as Array<{
      assignmentId: string;
      orgId: string;
      orgName: string;
      submissionId: string | null;
      status: string | null;
      updatedAt: string | Date | null;
    }>;

    const items = rows.map((row) => ({
      assignmentId: row.assignmentId,
      orgId: row.orgId,
      orgName: row.orgName ?? '',
      submissionId: row.submissionId ?? null,
      status: row.status ?? 'NOT_STARTED',
      updatedAt: row.updatedAt ?? null,
    }));

    const blockedItems = items.filter(
      (item) => item.status !== 'DISTRICT_APPROVED',
    );

    return {
      totalAssignments: items.length,
      readyAssignments: items.length - blockedItems.length,
      blockedItems,
      canAggregate: items.length > 0 && blockedItems.length === 0,
    };
  }
}
