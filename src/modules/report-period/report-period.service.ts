import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportPeriod, PeriodType } from './entities/report-period.entity';
import { CreateReportPeriodDto } from './dto/create-report-period.dto';
import { UpdateReportPeriodDto } from './dto/update-report-period.dto';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(value: string): Date {
  // Expect YYYY-MM-DD (from IsDateString), force midnight UTC-like by using Date(value)
  const d = new Date(value);
  if (Number.isNaN(d.getTime()))
    throw new BadRequestException('Ngày không hợp lệ');
  return d;
}

function quarterOf(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}

function isoWeekNumber(date: Date): { year: number; week: number } {
  // ISO week date weeks start on Monday
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week };
}

@Injectable()
export class ReportPeriodService {
  constructor(
    @InjectRepository(ReportPeriod)
    private readonly repo: Repository<ReportPeriod>,
  ) {}

  async findAll(query: ReportPeriodQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('p');

    if (query.type) {
      qb.andWhere('p.periodType = :type', { type: query.type });
    }

    if (query.from) {
      qb.andWhere('p.dateTo >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('p.dateFrom <= :to', { to: query.to });
    }

    qb.orderBy('p.dateFrom', 'DESC').addOrderBy('p.periodType', 'ASC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { page, limit, total },
    };
  }

  async findOne(id: string): Promise<ReportPeriod> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy kỳ báo cáo');
    return p;
  }

  async create(dto: CreateReportPeriodDto, createdBy?: string | null) {
    const dFrom = parseDateOnly(dto.dateFrom);
    const dTo = parseDateOnly(dto.dateTo);
    if (dTo.getTime() < dFrom.getTime()) {
      throw new BadRequestException('PERIOD_INVALID_RANGE');
    }

    await this.assertNoDuplicate(dto.periodType, ymd(dFrom), ymd(dTo));

    const code = await this.generateCode(dto.periodType, dFrom, dTo);
    const existsCode = await this.repo.exist({ where: { code } });
    if (existsCode) {
      throw new ConflictException('PERIOD_CODE_DUPLICATE');
    }

    const entity = this.repo.create({
      code,
      name: dto.name,
      periodType: dto.periodType,
      dateFrom: ymd(dFrom),
      dateTo: ymd(dTo),
      isActive: dto.isActive ?? true,
      createdBy: createdBy ?? null,
    });

    const saved = await this.repo.save(entity);
    return { id: saved.id };
  }

  async update(id: string, dto: UpdateReportPeriodDto) {
    const existing = await this.findOne(id);

    const nextFrom = dto.dateFrom ?? existing.dateFrom;
    const nextTo = dto.dateTo ?? existing.dateTo;
    const nextType = dto.periodType ?? existing.periodType;

    const dFrom = parseDateOnly(nextFrom);
    const dTo = parseDateOnly(nextTo);
    if (dTo.getTime() < dFrom.getTime()) {
      throw new BadRequestException('PERIOD_INVALID_RANGE');
    }

    await this.assertNoDuplicate(nextType, ymd(dFrom), ymd(dTo), id);

    Object.assign(existing, {
      name: dto.name ?? existing.name,
      periodType: nextType,
      dateFrom: ymd(dFrom),
      dateTo: ymd(dTo),
      isActive: dto.isActive ?? existing.isActive,
    });

    // If type/range changed, regenerate code (keeps code meaningful; still unique constraint)
    if (dto.periodType || dto.dateFrom || dto.dateTo) {
      const code = await this.generateCode(nextType, dFrom, dTo);
      if (code !== existing.code) {
        const existsCode = await this.repo.exist({ where: { code } });
        if (existsCode) throw new ConflictException('PERIOD_CODE_DUPLICATE');
        existing.code = code;
      }
    }

    await this.repo.save(existing);
    return { ok: true };
  }

  async remove(id: string) {
    // Block delete if has assignments
    const rows = await this.repo.query(
      `SELECT 1 FROM "form_assignments" WHERE "period_id" = $1 LIMIT 1`,
      [id],
    );
    if (rows.length > 0) {
      throw new ConflictException('PERIOD_DELETE_BLOCKED');
    }

    const p = await this.findOne(id);
    await this.repo.remove(p);
    return { ok: true };
  }

  private async assertNoDuplicate(
    periodType: PeriodType,
    dateFrom: string,
    dateTo: string,
    excludeId?: string,
  ) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.period_type = :periodType', { periodType })
      .andWhere('p.date_from = :dateFrom', { dateFrom })
      .andWhere('p.date_to = :dateTo', { dateTo });

    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });

    const dup = await qb.getOne();
    if (dup) throw new ConflictException('PERIOD_DUPLICATE');
  }

  private async generateCode(
    type: PeriodType,
    dFrom: Date,
    _dTo: Date,
  ): Promise<string> {
    const yyyy = dFrom.getFullYear();
    const mm = String(dFrom.getMonth() + 1).padStart(2, '0');
    switch (type) {
      case PeriodType.THANG:
        return `K${yyyy}${mm}`;
      case PeriodType.QUY: {
        const q = quarterOf(dFrom);
        return `K${yyyy}Q${q}`;
      }
      case PeriodType.NAM:
        return `K${yyyy}`;
      case PeriodType.TUAN: {
        const wk = isoWeekNumber(dFrom);
        const ww = String(wk.week).padStart(2, '0');
        return `K${wk.year}W${ww}`;
      }
      default:
        return `K${yyyy}${mm}`;
    }
  }
}
