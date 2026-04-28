import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Form } from './entities/form.entity';
import { FormAttribute } from './entities/form-attribute.entity';
import { FormIndicator } from './entities/form-indicator.entity';
import { FieldCategory } from './entities/field-category.entity';
import { IndicatorCatalog } from './entities/indicator-catalog.entity';
import { ImportJob } from '../import-job/entities/import-job.entity';
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
import { UpdateIndicatorCatalogDto } from './dto/update-indicator-catalog.dto';
import { IndicatorCatalogQueryDto } from './dto/indicator-catalog-query.dto';
import { CreateFieldCategoryDto } from './dto/create-field-category.dto';
import { PatchFieldCategoryDto } from './dto/patch-field-category.dto';
import { FieldCategoryQueryDto } from './dto/field-category-query.dto';

const DEFAULT_FORM_SYSTEM_ATTRIBUTES = [
  { name: 'Thứ tự', dataType: 'integer', sortOrder: 0 },
  { name: 'Mã chỉ tiêu', dataType: 'text', sortOrder: 1 },
  { name: 'Tên chỉ tiêu', dataType: 'text', sortOrder: 2 },
  { name: 'Đơn vị tính', dataType: 'text', sortOrder: 3 },
];

@Injectable()
export class FormDesignerService {
  constructor(
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormAttribute)
    private readonly attrRepo: Repository<FormAttribute>,
    @InjectRepository(FormIndicator)
    private readonly indRepo: Repository<FormIndicator>,
    @InjectRepository(FieldCategory)
    private readonly fieldCategoryRepo: Repository<FieldCategory>,
    @InjectRepository(IndicatorCatalog)
    private readonly catalogRepo: Repository<IndicatorCatalog>,
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    private readonly dataSource: DataSource,
  ) {}

  private async seedDefaultFormAttributes(
    manager: EntityManager,
    formId: string,
  ): Promise<void> {
    const attrRepo = manager.getRepository(FormAttribute);
    for (const def of DEFAULT_FORM_SYSTEM_ATTRIBUTES) {
      await attrRepo.save(
        attrRepo.create({
          formId,
          name: def.name,
          dataType: def.dataType,
          isRequired: false,
          isVisible: true,
          isSystem: true,
          sortOrder: def.sortOrder,
          options: null,
        }),
      );
    }
  }

  private async resolveFormCode(
    requested: string | undefined,
    repo: Repository<Form>,
  ): Promise<string> {
    const trimmed = requested?.trim() ?? '';
    if (!trimmed) {
      return this.generateUniqueFormCode(repo);
    }
    const exists = await repo.exist({
      where: { code: ILike(trimmed) },
      withDeleted: true,
    });
    if (exists) {
      throw new ConflictException('FORM_CODE_DUPLICATE');
    }
    return trimmed;
  }

  private async generateUniqueFormCode(repo?: Repository<Form>): Promise<string> {
    const targetRepo = repo ?? this.formRepo;
    for (let i = 0; i < 20; i++) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const code = `FM-${suffix}`;
      const exists = await targetRepo.exist({
        where: { code: ILike(code) },
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
      fieldCategoryId: f.fieldCategoryRef?.id ?? null,
      /** Mã `code` từ bảng `field_categories` (join), không còn cột `forms.field_category`. */
      fieldCategory: f.fieldCategoryRef?.code ?? null,
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

    const qb = this.formRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.fieldCategoryRef', 'fc');
    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(f.name) LIKE :q OR LOWER(f.code) LIKE :q)',
        { q },
      );
    }
    if (query.fieldCategory !== undefined) {
      qb.andWhere('fc.code = :fcc', { fcc: query.fieldCategory });
    }
    if (query.fieldCategoryId !== undefined) {
      qb.andWhere('f.fieldCategoryRef = :fcid', { fcid: query.fieldCategoryId });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('f.isActive = :ia', { ia: query.isActive });
    }
    qb.orderBy('f.createdAt', 'DESC').skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((f) => this.toListItem(f)),
      meta: { page, limit, total },
    };
  }

  async createForm(dto: CreateFormDto, userId: string | undefined) {
    const fc = await this.requireActiveFieldCategory(dto.fieldCategoryId);
    const id = await this.dataSource.transaction(async (manager) => {
      const formRepo = manager.getRepository(Form);
      const code = await this.resolveFormCode(dto.code, formRepo);
      const created = formRepo.create({
        code,
        name: dto.name.trim(),
        fieldCategoryRef: { id: fc.id } as FieldCategory,
        description: dto.description?.trim() ?? null,
        parentFormId: dto.parentFormId ?? null,
        createdBy: userId ?? null,
        isActive: true,
      });
      const saved = await formRepo.save(created);
      await this.seedDefaultFormAttributes(manager, saved.id);
      return saved.id;
    });
    return { id };
  }

  async findOneForm(id: string) {
    const f = await this.formRepo.findOne({
      where: { id },
      relations: { fieldCategoryRef: true },
    });
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
    const f = await this.formRepo.findOne({
      where: { id },
      relations: { fieldCategoryRef: true },
    });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (code !== f.code) {
        const exists = await this.formRepo.exist({
          where: { code: ILike(code) },
          withDeleted: true,
        });
        if (exists) throw new ConflictException('FORM_CODE_DUPLICATE');
        f.code = code;
      }
    }

    if (dto.name !== undefined) f.name = dto.name.trim();
    if (dto.fieldCategoryId !== undefined) {
      if (dto.fieldCategoryId === null) {
        f.fieldCategoryRef = null;
      } else {
        const fc = await this.requireActiveFieldCategory(dto.fieldCategoryId);
        f.fieldCategoryRef = { id: fc.id } as FieldCategory;
      }
    }
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
    const src = await this.formRepo.findOne({
      where: { id: sourceId },
      relations: { fieldCategoryRef: true },
    });
    if (!src) throw new NotFoundException('Không tìm thấy biểu mẫu nguồn');

    const code = await this.resolveFormCode(dto.code, this.formRepo);
    const attrs = await this.attrRepo.find({ where: { formId: sourceId } });
    const inds = await this.indRepo.find({ where: { formId: sourceId } });

    const targetCategoryId =
      dto.fieldCategoryId ?? src.fieldCategoryRef?.id ?? null;
    let fieldCategoryRef: FieldCategory | null = null;
    if (targetCategoryId) {
      const fc = await this.requireActiveFieldCategory(targetCategoryId);
      fieldCategoryRef = { id: fc.id } as FieldCategory;
    }

    const newId = await this.dataSource.transaction(async (manager) => {
      const formRepo = manager.getRepository(Form);
      const attrRepo = manager.getRepository(FormAttribute);
      const indRepo = manager.getRepository(FormIndicator);

    const f = formRepo.create({
        code,
        name: dto.name.trim(),
        fieldCategoryRef,
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

  async reorderAttributes(formId: string, orderedIds: string[]) {
    await this.ensureForm(formId);
    const existing = await this.attrRepo.find({ where: { formId } });
    const idSet = new Set(existing.map((x) => x.id));
    for (const oid of orderedIds) {
      if (!idSet.has(oid)) {
        throw new BadRequestException(`attributeId không thuộc form: ${oid}`);
      }
    }
    for (let idx = 0; idx < orderedIds.length; idx++) {
      await this.attrRepo.update({ id: orderedIds[idx] }, { sortOrder: idx });
    }
    return { ok: true };
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

  async findAllCatalogEntries(query: IndicatorCatalogQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 200);
    const skip = (page - 1) * limit;

    const qb = this.catalogRepo.createQueryBuilder('cat');

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(cat.name) LIKE :q OR LOWER(cat.code) LIKE :q)', { q });
    }

    qb.orderBy('cat.name', 'ASC').skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows,
      meta: { page, limit, total },
    };
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

  async patchCatalogEntry(id: string, dto: UpdateIndicatorCatalogDto) {
    const row = await this.catalogRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy chỉ tiêu trong danh mục');

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (code !== row.code) {
        const dup = await this.catalogRepo.exist({ where: { code } });
        if (dup) throw new ConflictException('CATALOG_CODE_DUPLICATE');
        row.code = code;
      }
    }

    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.unit !== undefined) row.unit = dto.unit;
    if (dto.dataType !== undefined) row.dataType = dto.dataType.trim();

    await this.catalogRepo.save(row);
    return { ok: true };
  }

  async removeCatalogEntry(id: string) {
    const row = await this.catalogRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy chỉ tiêu trong danh mục');

    // Check if being used in any form indicators
    const used = await this.indRepo.exist({ where: { catalogIndicatorId: id } });
    if (used) {
      throw new ConflictException('CATALOG_ENTRY_IN_USE');
    }

    await this.catalogRepo.remove(row);
    return { ok: true };
  }

  async findAllFieldCategories(query: FieldCategoryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 200);
    const skip = (page - 1) * limit;
    const qb = this.fieldCategoryRepo.createQueryBuilder('c');
    if (query.isActive !== undefined) {
      qb.andWhere('c.isActive = :ia', { ia: query.isActive });
    }
    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(c.name) LIKE :q OR LOWER(c.code) LIKE :q)',
        { q },
      );
    }
    qb.orderBy('c.sort_order', 'ASC').addOrderBy('c.name', 'ASC').skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
      meta: { page, limit, total },
    };
  }

  async createFieldCategory(dto: CreateFieldCategoryDto) {
    const code = dto.code.trim().toLowerCase();
    const dup = await this.fieldCategoryRepo.exist({ where: { code } });
    if (dup) throw new ConflictException('FIELD_CATEGORY_CODE_DUPLICATE');
    const row = this.fieldCategoryRepo.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.fieldCategoryRepo.save(row);
    return { id: saved.id };
  }

  async patchFieldCategory(id: string, dto: PatchFieldCategoryDto) {
    const row = await this.fieldCategoryRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy lĩnh vực');
    if (dto.code !== undefined) {
      const code = dto.code.trim().toLowerCase();
      if (code !== row.code) {
        const dup = await this.fieldCategoryRepo.exist({ where: { code } });
        if (dup) throw new ConflictException('FIELD_CATEGORY_CODE_DUPLICATE');
        row.code = code;
      }
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) {
      row.description =
        dto.description === null || dto.description === ''
          ? null
          : dto.description.trim();
    }
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    await this.fieldCategoryRepo.save(row);
    return { ok: true };
  }

  private async requireActiveFieldCategory(id: string): Promise<FieldCategory> {
    const row = await this.fieldCategoryRepo.findOne({
      where: { id, isActive: true },
    });
    if (!row) {
      throw new BadRequestException(
        'fieldCategoryId không tồn tại, không hợp lệ hoặc đã ngưng sử dụng',
      );
    }
    return row;
  }

  private async ensureForm(id: string): Promise<Form> {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    return f;
  }
}
