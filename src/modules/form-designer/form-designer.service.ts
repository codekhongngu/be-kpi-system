import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Form } from './entities/form.entity';
import { FormAttribute } from './entities/form-attribute.entity';
import { FormIndicator } from './entities/form-indicator.entity';
import { IndicatorCatalog } from './entities/indicator-catalog.entity';
import { ImportJob } from '../user/entities/import-job.entity';
import { User } from '../user/entities/user.entity';
import { FormQueryDto } from './dto/form-query.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { PatchFormDto } from './dto/patch-form.dto';
import { CopyFormDto } from './dto/copy-form.dto';
import { CreateFormAttributeDto } from './dto/create-form-attribute.dto';
import { PatchFormAttributeDto } from './dto/patch-form-attribute.dto';
import { CreateFormIndicatorDto } from './dto/create-form-indicator.dto';
import { PatchFormIndicatorDto } from './dto/patch-form-indicator.dto';
import { CreateIndicatorCatalogDto } from './dto/create-indicator-catalog.dto';

@Injectable()
export class FormDesignerService {
  constructor(
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormAttribute)
    private readonly attrRepo: Repository<FormAttribute>,
    @InjectRepository(FormIndicator)
    private readonly indRepo: Repository<FormIndicator>,
    @InjectRepository(IndicatorCatalog)
    private readonly catalogRepo: Repository<IndicatorCatalog>,
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateUniqueFormCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const code = `FM-${suffix}`;
      const exists = await this.formRepo.exist({
        where: { code },
        withDeleted: true,
      });
      if (!exists) return code;
    }
    throw new BadRequestException('Không tạo được mã biểu mẫu duy nhất');
  }

  private async nextSortOrder(
    repo: Repository<FormAttribute> | Repository<FormIndicator>,
    formId: string,
    preferred?: number,
  ): Promise<number> {
    if (preferred !== undefined) return preferred;
    const row = await repo
      .createQueryBuilder('e')
      .select('COALESCE(MAX(e.sortOrder), -1)', 'm')
      .where('e.formId = :formId', { formId })
      .getRawOne<{ m: string }>();
    return Number(row?.m ?? -1) + 1;
  }

  private toListItem(f: Form) {
    return {
      id: f.id,
      code: f.code,
      name: f.name,
      fieldCategory: f.fieldCategory,
      periodType: f.periodType,
      isActive: f.isActive,
      templateFileUrl: f.templateFile,
      parentFormId: f.parentFormId,
    };
  }

  private mapAttribute(a: FormAttribute) {
    return {
      id: a.id,
      name: a.name,
      dataType: a.dataType,
      isRequired: a.isRequired,
      isVisible: a.isVisible,
      isSystem: a.isSystem,
      sortOrder: a.sortOrder,
      options: a.options,
    };
  }

  private mapIndicator(i: FormIndicator) {
    return {
      id: i.id,
      code: i.code,
      name: i.name,
      unit: i.unit,
      dataType: i.dataType,
      isRequired: i.isRequired,
      isCalculated: i.isCalculated,
      formula: i.formula,
      groupName: i.groupName,
      sortOrder: i.sortOrder,
      minValue: i.minValue,
      maxValue: i.maxValue,
      isActive: i.isActive,
    };
  }

  async findAllForms(query: FormQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.formRepo.createQueryBuilder('f');
    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(f.name) LIKE :q OR LOWER(f.code) LIKE :q)',
        { q },
      );
    }
    if (query.fieldCategory !== undefined) {
      qb.andWhere('f.field_category = :fc', { fc: query.fieldCategory });
    }
    if (query.periodType !== undefined) {
      qb.andWhere('f.period_type = :pt', { pt: query.periodType });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('f.is_active = :ia', { ia: query.isActive });
    }
    qb.orderBy('f.created_at', 'DESC').skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((f) => this.toListItem(f)),
      meta: { page, limit, total },
    };
  }

  async createForm(dto: CreateFormDto, userId: string | undefined) {
    const code = await this.generateUniqueFormCode();
    const created = this.formRepo.create({
      code,
      name: dto.name.trim(),
      fieldCategory: dto.fieldCategory.trim(),
      periodType: dto.periodType,
      description: dto.description?.trim() ?? null,
      parentFormId: dto.parentFormId ?? null,
      createdBy: userId ?? null,
      isActive: true,
    });
    const saved = await this.formRepo.save(created);
    return { id: saved.id };
  }

  async findOneForm(id: string) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    const [attrs, inds] = await Promise.all([
      this.attrRepo.find({
        where: { formId: id },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      this.indRepo.find({
        where: { formId: id },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
    ]);
    return {
      ...this.toListItem(f),
      description: f.description,
      attributes: attrs.map((a) => this.mapAttribute(a)),
      indicators: inds.map((i) => this.mapIndicator(i)),
    };
  }

  async patchForm(id: string, dto: PatchFormDto) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    if (dto.name !== undefined) f.name = dto.name.trim();
    if (dto.fieldCategory !== undefined) {
      f.fieldCategory =
        dto.fieldCategory === null ? null : dto.fieldCategory.trim();
    }
    if (dto.periodType !== undefined) f.periodType = dto.periodType;
    if (dto.description !== undefined) {
      f.description =
        dto.description === null || dto.description === ''
          ? null
          : dto.description.trim();
    }
    if (dto.isActive !== undefined) f.isActive = dto.isActive;
    if (dto.parentFormId !== undefined) f.parentFormId = dto.parentFormId;
    await this.formRepo.save(f);
    return { ok: true };
  }

  async removeForm(id: string) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    const ac = await this.dataSource.query<{ c: string }[]>(
      'SELECT COUNT(1)::text AS c FROM form_assignments WHERE form_id = $1',
      [id],
    );
    const n = Number(ac[0]?.c ?? 0);
    if (n > 0) {
      throw new ConflictException('FORM_DELETE_BLOCKED');
    }
    await this.formRepo.softRemove(f);
    return { ok: true };
  }

  async setActive(id: string, isActive: boolean) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    f.isActive = isActive;
    await this.formRepo.save(f);
    return { ok: true };
  }

  async setTemplateFile(id: string, originalName: string) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    const safe = originalName.replace(/[^\w.\-]+/g, '_').slice(0, 200);
    f.templateFile = safe;
    await this.formRepo.save(f);
    return {
      fileId: f.id,
      url: null as string | null,
    };
  }

  async copyForm(sourceId: string, dto: CopyFormDto, userId: string | undefined) {
    const src = await this.formRepo.findOne({ where: { id: sourceId } });
    if (!src) throw new NotFoundException('Không tìm thấy biểu mẫu nguồn');

    const code = await this.generateUniqueFormCode();
    const attrs = await this.attrRepo.find({ where: { formId: sourceId } });
    const inds = await this.indRepo.find({ where: { formId: sourceId } });

    const newId = await this.dataSource.transaction(async (manager) => {
      const formRepo = manager.getRepository(Form);
      const attrRepo = manager.getRepository(FormAttribute);
      const indRepo = manager.getRepository(FormIndicator);

      const f = formRepo.create({
        code,
        name: dto.name.trim(),
        fieldCategory: (dto.fieldCategory ?? src.fieldCategory)?.trim() ?? null,
        periodType: dto.periodType ?? src.periodType,
        description: src.description,
        isActive: false,
        templateFile: src.templateFile,
        parentFormId: dto.parentFormId ?? src.parentFormId,
        createdBy: userId ?? null,
      });
      const saved = await formRepo.save(f);
      for (const a of attrs) {
        await attrRepo.save(
          attrRepo.create({
            formId: saved.id,
            name: a.name,
            dataType: a.dataType,
            isRequired: a.isRequired,
            isVisible: a.isVisible,
            isSystem: a.isSystem,
            sortOrder: a.sortOrder,
            options: a.options,
          }),
        );
      }
      for (const i of inds) {
        await indRepo.save(
          indRepo.create({
            formId: saved.id,
            code: i.code,
            name: i.name,
            unit: i.unit,
            dataType: i.dataType,
            isRequired: i.isRequired,
            isCalculated: i.isCalculated,
            formula: i.formula,
            groupName: i.groupName,
            sortOrder: i.sortOrder,
            minValue: i.minValue,
            maxValue: i.maxValue,
            isActive: i.isActive,
            catalogIndicatorId: i.catalogIndicatorId,
          }),
        );
      }
      return saved.id;
    });

    return { id: newId };
  }

  async listAttributes(formId: string) {
    await this.ensureForm(formId);
    const rows = await this.attrRepo.find({
      where: { formId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return { items: rows.map((a) => this.mapAttribute(a)) };
  }

  async createAttribute(formId: string, dto: CreateFormAttributeDto) {
    await this.ensureForm(formId);
    const nextSort = await this.nextSortOrder(this.attrRepo, formId, dto.sortOrder);
    const a = this.attrRepo.create({
      formId,
      name: dto.name.trim(),
      dataType: dto.dataType ?? null,
      isRequired: dto.isRequired ?? false,
      isVisible: dto.isVisible ?? true,
      isSystem: dto.isSystem ?? false,
      sortOrder: nextSort,
      options: dto.options ?? null,
    });
    const saved = await this.attrRepo.save(a);
    return { id: saved.id };
  }

  async patchAttribute(
    formId: string,
    attrId: string,
    dto: PatchFormAttributeDto,
  ) {
    const a = await this.attrRepo.findOne({
      where: { id: attrId, formId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy thuộc tính');
    if (dto.name !== undefined) a.name = dto.name.trim();
    if (dto.dataType !== undefined) a.dataType = dto.dataType;
    if (dto.isRequired !== undefined) a.isRequired = dto.isRequired;
    if (dto.isVisible !== undefined) a.isVisible = dto.isVisible;
    if (dto.sortOrder !== undefined) a.sortOrder = dto.sortOrder;
    if (dto.options !== undefined) a.options = dto.options;
    await this.attrRepo.save(a);
    return { ok: true };
  }

  async removeAttribute(formId: string, attrId: string) {
    const a = await this.attrRepo.findOne({
      where: { id: attrId, formId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy thuộc tính');
    if (a.isSystem) {
      throw new ConflictException('ATTRIBUTE_SYSTEM_PROTECTED');
    }
    await this.attrRepo.remove(a);
    return { ok: true };
  }

  async listIndicators(formId: string) {
    await this.ensureForm(formId);
    const rows = await this.indRepo.find({
      where: { formId },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return { items: rows.map((i) => this.mapIndicator(i)) };
  }

  async createIndicator(formId: string, dto: CreateFormIndicatorDto) {
    await this.ensureForm(formId);
    const dup = await this.indRepo.exist({
      where: { formId, code: dto.code.trim() },
    });
    if (dup) throw new ConflictException('INDICATOR_CODE_DUPLICATE');
    if (dto.catalogIndicatorId) {
      const c = await this.catalogRepo.findOne({
        where: { id: dto.catalogIndicatorId },
      });
      if (!c) throw new BadRequestException('catalogIndicatorId không tồn tại');
    }
    const nextSort = await this.nextSortOrder(this.indRepo, formId, dto.sortOrder);
    const i = this.indRepo.create({
      formId,
      code: dto.code.trim(),
      name: dto.name.trim(),
      unit: dto.unit ?? null,
      dataType: dto.dataType.trim(),
      isRequired: dto.isRequired ?? true,
      isCalculated: dto.isCalculated ?? false,
      formula: dto.formula ?? null,
      groupName: dto.groupName ?? null,
      sortOrder: nextSort,
      minValue: dto.minValue ?? null,
      maxValue: dto.maxValue ?? null,
      isActive: dto.isActive ?? true,
      catalogIndicatorId: dto.catalogIndicatorId ?? null,
    });
    const saved = await this.indRepo.save(i);
    return { id: saved.id };
  }

  async patchIndicator(
    formId: string,
    indicatorId: string,
    dto: PatchFormIndicatorDto,
  ) {
    const i = await this.indRepo.findOne({
      where: { id: indicatorId, formId },
    });
    if (!i) throw new NotFoundException('Không tìm thấy chỉ tiêu');
    if (dto.code !== undefined && dto.code.trim() !== i.code) {
      const dup = await this.indRepo
        .createQueryBuilder('ind')
        .where('ind.form_id = :formId', { formId })
        .andWhere('ind.code = :code', { code: dto.code.trim() })
        .andWhere('ind.id != :id', { id: indicatorId })
        .getExists();
      if (dup) throw new ConflictException('INDICATOR_CODE_DUPLICATE');
      i.code = dto.code.trim();
    }
    if (dto.name !== undefined) i.name = dto.name.trim();
    if (dto.unit !== undefined) i.unit = dto.unit;
    if (dto.dataType !== undefined) i.dataType = dto.dataType.trim();
    if (dto.isRequired !== undefined) i.isRequired = dto.isRequired;
    if (dto.isCalculated !== undefined) i.isCalculated = dto.isCalculated;
    if (dto.formula !== undefined) i.formula = dto.formula;
    if (dto.groupName !== undefined) i.groupName = dto.groupName;
    if (dto.sortOrder !== undefined) i.sortOrder = dto.sortOrder;
    if (dto.minValue !== undefined) i.minValue = dto.minValue;
    if (dto.maxValue !== undefined) i.maxValue = dto.maxValue;
    if (dto.isActive !== undefined) i.isActive = dto.isActive;
    if (dto.catalogIndicatorId !== undefined) {
      if (dto.catalogIndicatorId) {
        const c = await this.catalogRepo.findOne({
          where: { id: dto.catalogIndicatorId },
        });
        if (!c) throw new BadRequestException('catalogIndicatorId không tồn tại');
      }
      i.catalogIndicatorId = dto.catalogIndicatorId;
    }
    await this.indRepo.save(i);
    return { ok: true };
  }

  async removeIndicator(formId: string, indicatorId: string) {
    const i = await this.indRepo.findOne({
      where: { id: indicatorId, formId },
    });
    if (!i) throw new NotFoundException('Không tìm thấy chỉ tiêu');
    const rows = await this.dataSource.query<{ c: string }[]>(
      'SELECT COUNT(1)::text AS c FROM report_data WHERE indicator_id = $1',
      [indicatorId],
    );
    const dataCount = Number(rows[0]?.c ?? 0);
    if (dataCount > 0) {
      throw new ConflictException('INDICATOR_DELETE_HAS_DATA');
    }
    await this.indRepo.remove(i);
    return { ok: true };
  }

  async reorderIndicators(formId: string, orderedIds: string[]) {
    await this.ensureForm(formId);
    const existing = await this.indRepo.find({ where: { formId } });
    const idSet = new Set(existing.map((x) => x.id));
    for (const oid of orderedIds) {
      if (!idSet.has(oid)) {
        throw new BadRequestException(`indicatorId không thuộc form: ${oid}`);
      }
    }
    for (let idx = 0; idx < orderedIds.length; idx++) {
      await this.indRepo.update({ id: orderedIds[idx] }, { sortOrder: idx });
    }
    return { ok: true };
  }

  async enqueueAttributesImport(userId: string | undefined) {
    const job = this.importJobRepo.create({
      type: 'FORM_ATTRIBUTES_IMPORT',
      status: 'QUEUED',
      createdBy: userId ? ({ id: userId } as User) : null,
      summary: { note: 'Worker chưa xử lý — job đã tạo' },
    });
    const saved = await this.importJobRepo.save(job);
    return { jobId: saved.id };
  }

  async enqueueIndicatorsImport(userId: string | undefined) {
    const job = this.importJobRepo.create({
      type: 'FORM_INDICATORS_IMPORT',
      status: 'QUEUED',
      createdBy: userId ? ({ id: userId } as User) : null,
      summary: { note: 'Worker chưa xử lý — job đã tạo' },
    });
    const saved = await this.importJobRepo.save(job);
    return { jobId: saved.id };
  }

  async createCatalogEntry(dto: CreateIndicatorCatalogDto, userId: string | undefined) {
    const dup = await this.catalogRepo.exist({
      where: { code: dto.code.trim() },
    });
    if (dup) throw new ConflictException('CATALOG_CODE_DUPLICATE');
    const row = this.catalogRepo.create({
      code: dto.code.trim(),
      name: dto.name.trim(),
      unit: dto.unit ?? null,
      dataType: dto.dataType.trim(),
      createdBy: userId ?? null,
    });
    const saved = await this.catalogRepo.save(row);
    return { id: saved.id };
  }

  private async ensureForm(id: string): Promise<Form> {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    return f;
  }
}
