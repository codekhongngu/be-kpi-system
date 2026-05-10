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
import { TemplateStatus, TemplateType } from './entities/form.entity';
import { FormAttribute } from './entities/form-attribute.entity';
import { FormIndicator } from './entities/form-indicator.entity';
import { FormCellConfig } from './entities/form-cell-config.entity';
import { FormTemplateIndicatorOrgRule } from './entities/form-template-indicator-org-rule.entity';
import { FieldCategory } from './entities/field-category.entity';
import { IndicatorCatalog } from './entities/indicator-catalog.entity';
import { AssignmentBatch } from '../report-campaign/assignment/entities/assignment-batch.entity';
import { FormQueryDto } from './dto/form-query.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { PatchFormDto } from './dto/patch-form.dto';
import { CopyFormDto } from './dto/copy-form.dto';
import { CreateFormAttributeDto } from './dto/create-form-attribute.dto';
import { PatchFormAttributeDto } from './dto/patch-form-attribute.dto';
import { CreateFormIndicatorDto } from './dto/create-form-indicator.dto';
import { PatchFormIndicatorDto } from './dto/patch-form-indicator.dto';
import { ValidateIndicatorFormulaDto } from './dto/validate-indicator-formula.dto';
import { CreateIndicatorCatalogDto } from './dto/create-indicator-catalog.dto';
import { UpdateIndicatorCatalogDto } from './dto/update-indicator-catalog.dto';
import { IndicatorCatalogQueryDto } from './dto/indicator-catalog-query.dto';
import {
  ReorderAttributesDto,
  ReorderItemDto,
} from './dto/reorder-attributes.dto';
import { ReorderIndicatorsDto } from './dto/reorder-indicators.dto';
import { CreateFieldCategoryDto } from './dto/create-field-category.dto';
import { PatchFieldCategoryDto } from './dto/patch-field-category.dto';
import { FieldCategoryQueryDto } from './dto/field-category-query.dto';
import { PeriodType } from '../../common/period-type';
import { UpsertFormCellConfigsDto } from './dto/upsert-form-cell-configs.dto';
import { DeleteFormCellConfigsDto } from './dto/delete-form-cell-configs.dto';
import { UpsertTemplateScopesDto } from './dto/upsert-template-scope.dto';

const DEFAULT_FORM_SYSTEM_ATTRIBUTES = [
  { name: 'Tên chỉ tiêu', sortOrder: 0 },
  { name: 'Đơn vị tính', sortOrder: 1 },
];

@Injectable()
export class TemplateManagementService {
  constructor(
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormAttribute)
    private readonly attrRepo: Repository<FormAttribute>,
    @InjectRepository(FormIndicator)
    private readonly indRepo: Repository<FormIndicator>,
    @InjectRepository(FormCellConfig)
    private readonly cellConfigRepo: Repository<FormCellConfig>,
    @InjectRepository(FormTemplateIndicatorOrgRule)
    private readonly templateScopeRepo: Repository<FormTemplateIndicatorOrgRule>,
    @InjectRepository(FieldCategory)
    private readonly fieldCategoryRepo: Repository<FieldCategory>,
    @InjectRepository(IndicatorCatalog)
    private readonly catalogRepo: Repository<IndicatorCatalog>,
    @InjectRepository(AssignmentBatch)
    private readonly assignmentBatchRepo: Repository<AssignmentBatch>,
    private readonly dataSource: DataSource,
  ) {}

  private async hasCampaignOrAssignment(formId: string): Promise<boolean> {
    const campaignExists = await this.assignmentBatchRepo.exist({
      where: { formId },
    });
    if (campaignExists) return true;
    const rows = await this.dataSource.query<{ c: string }[]>(
      'SELECT COUNT(1)::text AS c FROM report_assignments WHERE template_id = $1',
      [formId],
    );
    return Number(rows?.[0]?.c ?? 0) > 0;
  }

  private async ensureTemplateStructureEditable(formId: string): Promise<void> {
    const f = await this.formRepo.findOne({ where: { id: formId } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    if (![TemplateStatus.DRAFT, TemplateStatus.READY].includes(f.templateStatus)) {
      throw new ConflictException('FORM_TEMPLATE_LOCKED_STATUS');
    }
    const used = await this.hasCampaignOrAssignment(formId);
    if (used) throw new ConflictException('FORM_TEMPLATE_LOCKED_HAS_REPORTS');
  }

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
          sortOrder: def.sortOrder,
          isSystem: true,
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

  private async generateUniqueFormCode(
    repo?: Repository<Form>,
  ): Promise<string> {
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
    parentId: string | null,
  ): Promise<number> {
    const qb = repo
      .createQueryBuilder('e')
      .select('COALESCE(MAX(e.sortOrder), -1)', 'm')
      .where('e.formId = :formId', { formId });
    if (parentId === null) {
      qb.andWhere('e.parentId IS NULL');
    } else {
      qb.andWhere('e.parentId = :parentId', { parentId });
    }
    const row = await qb.getRawOne<{ m: string }>();
    return Number(row?.m ?? -1) + 1;
  }

  private async ensureAttributeParent(
    formId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    const parent = await this.attrRepo.findOne({ where: { id: parentId, formId } });
    if (!parent) {
      throw new BadRequestException('parentId không thuộc form hoặc không tồn tại');
    }
  }

  private async ensureIndicatorParent(
    formId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    const parent = await this.indRepo.findOne({ where: { id: parentId, formId } });
    if (!parent) {
      throw new BadRequestException('parentId không thuộc form hoặc không tồn tại');
    }
  }

  private async ensureNoAttributeCycle(
    formId: string,
    attrId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    if (parentId === attrId) {
      throw new BadRequestException('parentId không hợp lệ (tự tham chiếu)');
    }
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === attrId) {
        throw new BadRequestException('parentId tạo vòng lặp');
      }
      const node = await this.attrRepo.findOne({ where: { id: cursor, formId } });
      cursor = node?.parentId ?? null;
    }
  }

  private async ensureNoIndicatorCycle(
    formId: string,
    indicatorId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    if (parentId === indicatorId) {
      throw new BadRequestException('parentId không hợp lệ (tự tham chiếu)');
    }
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === indicatorId) {
        throw new BadRequestException('parentId tạo vòng lặp');
      }
      const node = await this.indRepo.findOne({ where: { id: cursor, formId } });
      cursor = node?.parentId ?? null;
    }
  }

  private toListItem(f: Form) {
    return {
      id: f.id,
      code: f.code,
      name: f.name,
      templateType: f.templateType,
      templateStatus: f.templateStatus,
      periodType: f.periodType,
      fieldCategoryId: f.fieldCategoryRef?.id ?? null,
      fieldCategoryName: f.fieldCategoryRef?.name ?? null,
      fieldCategory: f.fieldCategoryRef?.name ?? null,
      isActive: f.isActive,
      templateFileUrl: f.templateFile,
      parentFormId: f.parentFormId,
    };
  }

  private mapAttribute(a: FormAttribute) {
    return {
      id: a.id,
      parentId: a.parentId,
      name: a.name,
      sortOrder: a.sortOrder,
      isSystem: a.isSystem,
    };
  }

  private mapIndicator(i: FormIndicator) {
    return {
      id: i.id,
      parentId: i.parentId,
      displayIndex: i.displayIndex,
      code: i.code,
      name: i.name,
      unit: i.unit,
      dataType: i.dataType,
      type: i.type,
      sortOrder: i.sortOrder,
    };
  }

  private mapCellConfig(c: FormCellConfig) {
    const formula = c.formula?.trim() ? c.formula.trim() : null;
    const readOnly = formula ? true : !c.isEditable;
    return {
      id: c.id,
      indicatorId: c.indicatorId,
      attributeId: c.attributeId,
      dataType: c.dataType === 'number' ? 'number' : 'text',
      required: Boolean(c.isRequired),
      readOnly,
      formula,
    };
  }

  private normalizeCellDataType(value: string | null | undefined): 'text' | 'number' {
    return value === 'number' ? 'number' : 'text';
  }

  private buildBaseCellConfig(
    indicator: FormIndicator,
    attribute: FormAttribute,
  ): { dataType: 'text' | 'number'; required: boolean; readOnly: boolean; formula: string | null } {
    const readOnlyByNode = indicator.type === 'TITLE';

    return {
      dataType: this.normalizeCellDataType(indicator.dataType ?? 'text'),
      required: false, // Defaulting to not required as field is gone
      readOnly: readOnlyByNode,
      formula: null,
    };
  }

  async findAllForms(query: FormQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.formRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.fieldCategoryRef', 'fc');

    const keyword = query.search?.trim() || query.q?.trim();
    if (keyword) {
      const q = `%${keyword.toLowerCase()}%`;
      qb.andWhere('(LOWER(f.name) LIKE :q OR LOWER(f.code) LIKE :q)', { q });
    }

    const category = query.category?.trim() || query.fieldCategory?.trim();
    if (category) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(category)) {
        qb.andWhere('f.fieldCategoryRef = :fcid', { fcid: category });
      } else {
        qb.andWhere('LOWER(fc.code) = :fcc', { fcc: category.toLowerCase() });
      }
    } else if (query.fieldCategoryId !== undefined) {
      qb.andWhere('f.fieldCategoryRef = :fcid', {
        fcid: query.fieldCategoryId,
      });
    }

    const statusRaw = query.status?.trim();
    if (statusRaw) {
      const normalized = statusRaw.toLowerCase();
      if (!['active', 'inactive', '1', '0', 'true', 'false'].includes(normalized)) {
        throw new BadRequestException(
          'status không hợp lệ, chỉ nhận active/inactive/true/false/1/0',
        );
      }
    }

    if (query.periodType) {
      qb.andWhere('f.periodType = :periodType', { periodType: query.periodType });
    }

    if (query.period?.trim()) {
      const period = query.period.trim();
      const periodNormalized = period.toUpperCase();
      if (Object.values(PeriodType).includes(periodNormalized as PeriodType)) {
        qb.andWhere('f.periodType = :periodType', { periodType: periodNormalized });
      } else
      if (/^\d{4}$/.test(period)) {
        const year = Number(period);
        qb.andWhere('EXTRACT(YEAR FROM f.createdAt) = :year', { year });
      } else if (/^\d{4}-\d{2}$/.test(period)) {
        const [y, m] = period.split('-').map(Number);
        if (m < 1 || m > 12) {
          throw new BadRequestException('period không hợp lệ (YYYY-MM)');
        }
        const from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const to = new Date(Date.UTC(y, m, 1, 0, 0, 0));
        qb.andWhere('f.createdAt >= :from AND f.createdAt < :to', { from, to });
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        const [y, m, d] = period.split('-').map(Number);
        const from = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
        const to = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
        qb.andWhere('f.createdAt >= :from AND f.createdAt < :to', { from, to });
      } else {
        throw new BadRequestException(
          'period không hợp lệ, dùng YYYY hoặc YYYY-MM hoặc YYYY-MM-DD',
        );
      }
    }

    qb.orderBy('f.createdAt', 'DESC').skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((f) => this.toListItem(f)),
      meta: { page, limit, total },
    };
  }

  async createForm(dto: CreateFormDto, userId: string | undefined) {
    const fieldCategoryId = dto.fieldCategoryId ?? dto.fieldCategoryRef;
    if (!fieldCategoryId) {
      throw new BadRequestException('fieldCategoryRef/fieldCategoryId là bắt buộc');
    }
    const fc = await this.requireActiveFieldCategory(fieldCategoryId);
    const id = await this.dataSource.transaction(async (manager) => {
      const formRepo = manager.getRepository(Form);
      const code = await this.resolveFormCode(dto.code, formRepo);
      const created = formRepo.create({
        code,
        name: dto.name.trim(),
        templateType: dto.templateType ?? TemplateType.AGGREGATE,
        templateStatus: TemplateStatus.DRAFT,
        periodType: dto.periodType ?? PeriodType.THANG,
        fieldCategoryRef: { id: fc.id } as FieldCategory,
        description: dto.description?.trim() ?? null,
        createdBy: userId ?? null,
        isActive: dto.isActive ?? true,
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
    const [attrs, inds, cellConfigs] = await Promise.all([
      this.attrRepo.find({
        where: { formId: id },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      this.indRepo.find({
        where: { formId: id },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
      this.cellConfigRepo.find({
        where: { formId: id },
        order: { createdAt: 'ASC' },
      }),
    ]);
    return {
      ...this.toListItem(f),
      description: f.description,
      attributes: attrs.map((a) => this.mapAttribute(a)),
      indicators: inds.map((i) => this.mapIndicator(i)),
      cellConfigs: cellConfigs.map((c) => this.mapCellConfig(c)),
    };
  }

  async patchForm(id: string, dto: PatchFormDto) {
    const f = await this.formRepo.findOne({
      where: { id },
      relations: { fieldCategoryRef: true },
    });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');

    if (dto.name !== undefined) f.name = dto.name.trim();
    const fieldCategoryPatch = dto.fieldCategoryRef ?? dto.fieldCategoryId;
    const shouldPatchFieldCategory =
      dto.fieldCategoryRef !== undefined || dto.fieldCategoryId !== undefined;
    if (shouldPatchFieldCategory) {
      if (fieldCategoryPatch === undefined) {
        throw new BadRequestException(
          'fieldCategoryRef/fieldCategoryId không hợp lệ',
        );
      }
      if (fieldCategoryPatch === null) {
        f.fieldCategoryRef = null;
      } else {
        const fc = await this.requireActiveFieldCategory(fieldCategoryPatch);
        f.fieldCategoryRef = { id: fc.id } as FieldCategory;
      }
    }
    if (dto.description !== undefined) {
      f.description =
        dto.description === null || dto.description === ''
          ? null
          : dto.description.trim();
    }
    if (dto.periodType !== undefined) f.periodType = dto.periodType;
    if (dto.templateType !== undefined) {
      const used = await this.hasCampaignOrAssignment(id);
      if (used && dto.templateType !== f.templateType) {
        throw new ConflictException('FORM_TEMPLATE_TYPE_LOCKED');
      }
      f.templateType = dto.templateType;
    }
    if (dto.isActive !== undefined) f.isActive = dto.isActive;
    await this.formRepo.save(f);
    return { ok: true };
  }

  async markFormReady(id: string) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    if (f.templateStatus !== TemplateStatus.DRAFT) {
      throw new ConflictException('FORM_INVALID_STATUS_TRANSITION');
    }
    f.templateStatus = TemplateStatus.READY;
    await this.formRepo.save(f);
    return { ok: true, templateStatus: f.templateStatus };
  }

  async archiveForm(id: string) {
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    if (![TemplateStatus.READY, TemplateStatus.IN_USE].includes(f.templateStatus)) {
      throw new ConflictException('FORM_INVALID_STATUS_TRANSITION');
    }
    f.templateStatus = TemplateStatus.ARCHIVED;
    await this.formRepo.save(f);
    return { ok: true, templateStatus: f.templateStatus };
  }

  async removeForm(id: string) {
    await this.ensureTemplateStructureEditable(id);
    const f = await this.formRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy biểu mẫu');
    const ac = await this.dataSource.query<{ c: string }[]>(
      'SELECT COUNT(1)::text AS c FROM report_assignments WHERE template_id = $1',
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
    if (!isActive) {
      const used = await this.hasCampaignOrAssignment(id);
      if (used) throw new ConflictException('FORM_DEACTIVATE_BLOCKED_HAS_REPORTS');
    }
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

  async copyForm(
    sourceId: string,
    dto: CopyFormDto,
    userId: string | undefined,
  ) {
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
        periodType: src.periodType,
        fieldCategoryRef,
        description: src.description,
        isActive: false,
        templateFile: src.templateFile,
        parentFormId: dto.parentFormId ?? src.parentFormId,
        createdBy: userId ?? null,
      });
      const saved = await formRepo.save(f);

      // Copy Attributes
      const attrMap = new Map<string, string>();
      // First pass: Create and save all attributes without parentId to get new IDs
      for (const a of attrs) {
        const newAttr = await attrRepo.save(
          attrRepo.create({
            formId: saved.id,
            name: a.name,
            sortOrder: a.sortOrder,
          }),
        );
        attrMap.set(a.id, newAttr.id);
      }
      // Second pass: Update parentId based on mapping
      for (const a of attrs) {
        if (a.parentId && attrMap.has(a.parentId)) {
          await attrRepo.update(attrMap.get(a.id)!, {
            parentId: attrMap.get(a.parentId),
          });
        }
      }

      // Copy Indicators
      const indMap = new Map<string, string>();
      // First pass: Create and save all indicators without parentId
      for (const i of inds) {
        const newInd = await indRepo.save(
          indRepo.create({
            formId: saved.id,
            displayIndex: i.displayIndex,
            code: i.code,
            name: i.name,
            unit: i.unit,
            dataType: i.dataType,
            type: i.type,
            sortOrder: i.sortOrder,
            catalogIndicatorId: i.catalogIndicatorId,
          }),
        );
        indMap.set(i.id, newInd.id);
      }
      // Second pass: Update parentId
      for (const i of inds) {
        if (i.parentId && indMap.has(i.parentId)) {
          await indRepo.update(indMap.get(i.id)!, {
            parentId: indMap.get(i.parentId),
          });
        }
      }
      return saved.id;
    });

    return { id: newId };
  }

  async listAttributes(formId: string, parentId?: string) {
    await this.ensureForm(formId);
    const where: any = { formId };
    if (parentId !== undefined) {
      where.parentId = parentId === '' || parentId === 'null' ? null : parentId;
    }
    const rows = await this.attrRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return { items: rows.map((a) => this.mapAttribute(a)) };
  }

  async createAttribute(formId: string, dto: CreateFormAttributeDto) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    await this.ensureAttributeParent(formId, dto.parentId ?? null);
    const nextSort = await this.nextSortOrder(
      this.attrRepo,
      formId,
      dto.parentId ?? null,
    );
    const a = this.attrRepo.create({
      formId,
      parentId: dto.parentId ?? null,
      name: dto.name.trim(),
      sortOrder: nextSort,
    });
    const saved = await this.attrRepo.save(a);
    return { id: saved.id };
  }

  async patchAttribute(
    formId: string,
    attrId: string,
    dto: PatchFormAttributeDto,
  ) {
    await this.ensureTemplateStructureEditable(formId);
    const a = await this.attrRepo.findOne({
      where: { id: attrId, formId },
    });
    if (!a) throw new NotFoundException('Không tìm thấy thuộc tính');
    if (a.isSystem) {
      throw new ConflictException('ATTRIBUTE_SYSTEM_PROTECTED');
    }
    if (dto.parentId !== undefined) {
      await this.ensureAttributeParent(formId, dto.parentId ?? null);
      await this.ensureNoAttributeCycle(formId, attrId, dto.parentId ?? null);
      a.parentId = dto.parentId;
    }
    if (dto.name !== undefined) a.name = dto.name.trim();
    await this.attrRepo.save(a);
    return { ok: true };
  }

  async removeAttribute(formId: string, attrId: string) {
    await this.ensureTemplateStructureEditable(formId);
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

  async listIndicators(formId: string, parentId?: string) {
    await this.ensureForm(formId);
    const where: any = { formId };
    if (parentId !== undefined) {
      where.parentId = parentId === '' || parentId === 'null' ? null : parentId;
    }
    const rows = await this.indRepo.find({
      where,
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return { items: rows.map((i) => this.mapIndicator(i)) };
  }

  async createIndicator(formId: string, dto: CreateFormIndicatorDto) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    await this.ensureIndicatorParent(formId, dto.parentId ?? null);
    const code = dto.code.trim();
    const dup = await this.indRepo
      .createQueryBuilder('ind')
      .where('ind.template_id = :formId', { formId })
      .andWhere('ind.code ILIKE :code', { code })
      .getExists();
    if (dup) throw new ConflictException('INDICATOR_CODE_DUPLICATE');
    if (dto.catalogIndicatorId) {
      const c = await this.catalogRepo.findOne({
        where: { id: dto.catalogIndicatorId },
      });
      if (!c) throw new BadRequestException('catalogIndicatorId không tồn tại');
    }
    const nextSort = await this.nextSortOrder(
      this.indRepo,
      formId,
      dto.parentId ?? null,
    );
    const i = this.indRepo.create({
      formId,
      parentId: dto.parentId ?? null,
      displayIndex: dto.displayIndex?.trim() ?? null,
      code,
      name: dto.name.trim(),
      unit: dto.unit ?? null,
      dataType: dto.dataType.trim(),
      type: dto.type ?? 'INPUT',
      sortOrder: nextSort,
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
    await this.ensureTemplateStructureEditable(formId);
    const i = await this.indRepo.findOne({
      where: { id: indicatorId, formId },
    });
    if (!i) throw new NotFoundException('Không tìm thấy chỉ tiêu');
    if (dto.parentId !== undefined) {
      await this.ensureIndicatorParent(formId, dto.parentId ?? null);
      await this.ensureNoIndicatorCycle(formId, indicatorId, dto.parentId ?? null);
      i.parentId = dto.parentId;
    }
    if (dto.displayIndex !== undefined)
      i.displayIndex = dto.displayIndex?.trim() ?? null;
    if (dto.code !== undefined && dto.code.trim() !== i.code) {
      const code = dto.code.trim();
      const dup = await this.indRepo
        .createQueryBuilder('ind')
        .where('ind.template_id = :formId', { formId })
        .andWhere('ind.code ILIKE :code', { code })
        .andWhere('ind.id != :id', { id: indicatorId })
        .getExists();
      if (dup) throw new ConflictException('INDICATOR_CODE_DUPLICATE');
      i.code = code;
    }
    if (dto.name !== undefined) i.name = dto.name.trim();
    if (dto.unit !== undefined) i.unit = dto.unit;
    if (dto.dataType !== undefined) i.dataType = dto.dataType.trim();
    if (dto.type !== undefined) i.type = dto.type;
    if (dto.catalogIndicatorId !== undefined) {
      if (dto.catalogIndicatorId) {
        const c = await this.catalogRepo.findOne({
          where: { id: dto.catalogIndicatorId },
        });
        if (!c)
          throw new BadRequestException('catalogIndicatorId không tồn tại');
      }
      i.catalogIndicatorId = dto.catalogIndicatorId;
    }
    await this.indRepo.save(i);
    return { ok: true };
  }



  async removeIndicator(formId: string, indicatorId: string) {
    await this.ensureTemplateStructureEditable(formId);
    const i = await this.indRepo.findOne({
      where: { id: indicatorId, formId },
    });
    if (!i) throw new NotFoundException('Không tìm thấy chỉ tiêu');
    const rows = await this.dataSource.query<{ c: string }[]>(
      'SELECT COUNT(1)::text AS c FROM report_submission_cells WHERE indicator_id = $1',
      [indicatorId],
    );
    const dataCount = Number(rows[0]?.c ?? 0);
    if (dataCount > 0) {
      throw new ConflictException('INDICATOR_DELETE_HAS_DATA');
    }
    await this.indRepo.remove(i);
    return { ok: true };
  }

  async listCellConfigs(formId: string) {
    await this.ensureForm(formId);
    const rows = await this.cellConfigRepo.find({
      where: { formId },
      order: { createdAt: 'ASC' },
    });
    return { items: rows.map((row) => this.mapCellConfig(row)) };
  }

  async upsertCellConfigs(formId: string, dto: UpsertFormCellConfigsDto) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    const indicators = await this.indRepo.find({ where: { formId } });
    const attributes = await this.attrRepo.find({ where: { formId } });
    const indicatorSet = new Set(indicators.map((x) => x.id));
    const attributeSet = new Set(attributes.map((x) => x.id));

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FormCellConfig);
      for (const item of dto.items) {
        if (!indicatorSet.has(item.indicatorId)) {
          throw new BadRequestException(
            `indicatorId không thuộc form hoặc không tồn tại: ${item.indicatorId}`,
          );
        }
        if (!attributeSet.has(item.attributeId)) {
          throw new BadRequestException(
            `attributeId không thuộc form hoặc không tồn tại: ${item.attributeId}`,
          );
        }

        const exists = await repo.findOne({
          where: {
            formId,
            indicatorId: item.indicatorId,
            attributeId: item.attributeId,
          },
        });

        const indicator = indicators.find((x) => x.id === item.indicatorId)!;
        if (indicator.type === 'TITLE') {
          throw new BadRequestException('Không thể cấu hình thuộc tính cho chỉ tiêu tiêu đề');
        }

        const attribute = attributes.find((x) => x.id === item.attributeId)!;
        const base = this.buildBaseCellConfig(indicator, attribute);

        const formula = item.formula !== undefined
          ? item.formula?.trim() || null
          : exists?.formula?.trim() || base.formula;
        const readOnlyInput = item.readOnly !== undefined
          ? Boolean(item.readOnly)
          : exists
            ? !exists.isEditable
            : base.readOnly;
        const normalized = {
          dataType:
            item.dataType !== undefined
              ? this.normalizeCellDataType(item.dataType)
              : exists
                ? this.normalizeCellDataType(exists.dataType)
                : base.dataType,
          required:
            item.required !== undefined
              ? Boolean(item.required)
              : exists
                ? Boolean(exists.isRequired)
                : base.required,
          readOnly: formula ? true : readOnlyInput,
          formula,
        };

        const sameAsBase =
          normalized.dataType === base.dataType &&
          normalized.required === base.required &&
          normalized.readOnly === base.readOnly &&
          normalized.formula === base.formula;

        if (sameAsBase) {
          if (exists) {
            await repo.delete({ id: exists.id });
          }
          continue;
        }

        if (!exists) {
          const created = repo.create({
            formId,
            indicatorId: item.indicatorId,
            attributeId: item.attributeId,
            dataType: normalized.dataType,
            isRequired: normalized.required,
            isEditable: !normalized.readOnly,
            formula: normalized.formula,
            validationRule: null,
            defaultValue: null,
          });
          await repo.save(created);
          continue;
        }

        exists.dataType = normalized.dataType;
        exists.isRequired = normalized.required;
        exists.isEditable = !normalized.readOnly;
        exists.formula = normalized.formula;
        await repo.save(exists);
      }
    });

    return { ok: true };
  }

  async deleteCellConfigs(formId: string, dto: DeleteFormCellConfigsDto) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FormCellConfig);
      for (const item of dto.items) {
        await repo.delete({
          formId,
          indicatorId: item.indicatorId,
          attributeId: item.attributeId,
        });
      }
    });
    return { ok: true };
  }

  async listEffectiveCellConfigs(formId: string) {
    await this.ensureForm(formId);
    const [indicators, attributes, overrides] = await Promise.all([
      this.indRepo.find({ where: { formId }, order: { sortOrder: 'ASC', code: 'ASC' } }),
      this.attrRepo.find({ where: { formId }, order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.cellConfigRepo.find({ where: { formId } }),
    ]);

    const overrideMap = new Map<string, FormCellConfig>();
    for (const row of overrides) {
      overrideMap.set(`${row.indicatorId}:${row.attributeId}`, row);
    }

    const items = indicators.flatMap((indicator) =>
      attributes.map((attribute) => {
        const key = `${indicator.id}:${attribute.id}`;
        const override = overrideMap.get(key);
        const base = this.buildBaseCellConfig(indicator, attribute);
        let formula = base.formula;
        let readOnly = base.readOnly;
        let dataType = base.dataType;
        let required = base.required;

        if (indicator.type !== 'TITLE' && override) {
          formula = override.formula?.trim() ? override.formula.trim() : base.formula;
          readOnly = formula ? true : !override.isEditable;
          dataType = override.dataType ? this.normalizeCellDataType(override.dataType) : base.dataType;
          required = override.isRequired ?? base.required;
        }

        return {
          indicatorId: indicator.id,
          attributeId: attribute.id,
          dataType,
          required,
          readOnly,
          formula,
          hasOverride: indicator.type !== 'TITLE' && Boolean(override),
        };
      }),
    );

    return { items };
  }

  async reorderIndicators(formId: string, items: ReorderItemDto[]) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    const existing = await this.indRepo.find({ where: { formId } });
    const idSet = new Set(existing.map((x) => x.id));
    for (const item of items) {
      if (!idSet.has(item.id)) {
        throw new BadRequestException(
          `indicatorId không thuộc form: ${item.id}`,
        );
      }
    }
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FormIndicator);
      const seen = new Set<string>();
      for (const item of items) {
        if (seen.has(item.id)) {
          throw new BadRequestException(
            `Trùng id trong danh sách reorder: ${item.id}`,
          );
        }
        seen.add(item.id);
      }

      const existingMap = new Map<string, FormIndicator>();
      for (const row of existing) existingMap.set(row.id, row);

      const parentIdSet = new Set(existing.map((x) => x.id));
      for (const item of items) {
        if (item.parentId === null) continue;
        if (item.parentId !== undefined && !parentIdSet.has(item.parentId)) {
          throw new BadRequestException(
            `parentId không thuộc form hoặc không tồn tại: ${item.parentId}`,
          );
        }
        if (item.parentId !== undefined && item.parentId === item.id) {
          throw new BadRequestException(
            `parentId không hợp lệ (tự tham chiếu): ${item.id}`,
          );
        }
      }

      const payloadById = new Map<string, ReorderItemDto>();
      for (const item of items) payloadById.set(item.id, item);

      const effectiveParentId = (id: string): string | null => {
        const item = payloadById.get(id);
        if (item && item.parentId !== undefined) return item.parentId ?? null;
        return existingMap.get(id)?.parentId ?? null;
      };

      const isCycle = (startId: string): boolean => {
        const visited = new Set<string>();
        let cur: string | null = effectiveParentId(startId);
        while (cur) {
          if (cur === startId) return true;
          if (visited.has(cur)) return true;
          visited.add(cur);
          cur = effectiveParentId(cur);
        }
        return false;
      };

      for (const item of items) {
        if (isCycle(item.id)) {
          throw new BadRequestException(`parentId tạo vòng lặp: ${item.id}`);
        }
      }

      const ROOT = '__root__';

      const affectedParents = new Set<string>();
      for (const item of items) {
        const oldParent = existingMap.get(item.id)?.parentId ?? null;
        const newParent = effectiveParentId(item.id);
        affectedParents.add(oldParent ?? ROOT);
        affectedParents.add(newParent ?? ROOT);
      }

      const payloadOrderByParent = new Map<string, string[]>();
      for (const item of items) {
        const parent = effectiveParentId(item.id);
        const key = parent ?? ROOT;
        const arr = payloadOrderByParent.get(key) ?? [];
        arr.push(item.id);
        payloadOrderByParent.set(key, arr);
      }

      for (const parentKey of affectedParents) {
        const parentId = parentKey === ROOT ? null : parentKey;
        const payloadIds = payloadOrderByParent.get(parentKey) ?? [];
        const payloadIdSet = new Set(payloadIds);

        const siblings = existing
          .filter((row) => effectiveParentId(row.id) === parentId)
          .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id.localeCompare(b.id);
          })
          .map((row) => row.id);
        const finalIds = [...siblings];
        const payloadPositions: number[] = [];
        for (let idx = 0; idx < siblings.length; idx++) {
          if (payloadIdSet.has(siblings[idx])) {
            payloadPositions.push(idx);
          }
        }
        for (let idx = 0; idx < payloadPositions.length; idx++) {
          finalIds[payloadPositions[idx]] = payloadIds[idx];
        }

        for (let idx = 0; idx < finalIds.length; idx++) {
          const id = finalIds[idx];
          const payloadItem = payloadById.get(id);
          const updateData: any = { sortOrder: idx };
          if (payloadItem && payloadItem.parentId !== undefined) {
            updateData.parentId = effectiveParentId(id);
          }
          await repo.update({ id }, updateData);
        }
      }
    });
    return { ok: true };
  }

  async reorderAttributes(formId: string, items: ReorderItemDto[]) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    const existing = await this.attrRepo.find({ where: { formId } });
    const idSet = new Set(existing.map((x) => x.id));
    const systemIds = new Set(existing.filter((x) => x.isSystem).map((x) => x.id));
    for (const item of items) {
      if (!idSet.has(item.id)) {
        throw new BadRequestException(
          `attributeId không thuộc form: ${item.id}`,
        );
      }
      if (systemIds.has(item.id)) {
        throw new ConflictException('ATTRIBUTE_SYSTEM_PROTECTED');
      }
    }
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FormAttribute);
      const seen = new Set<string>();
      for (const item of items) {
        if (seen.has(item.id)) {
          throw new BadRequestException(
            `Trùng id trong danh sách reorder: ${item.id}`,
          );
        }
        seen.add(item.id);
      }

      const existingMap = new Map<string, FormAttribute>();
      for (const row of existing) existingMap.set(row.id, row);

      const parentIdSet = new Set(existing.map((x) => x.id));
      for (const item of items) {
        if (item.parentId === null) continue;
        if (item.parentId !== undefined && !parentIdSet.has(item.parentId)) {
          throw new BadRequestException(
            `parentId không thuộc form hoặc không tồn tại: ${item.parentId}`,
          );
        }
        if (item.parentId !== undefined && item.parentId === item.id) {
          throw new BadRequestException(
            `parentId không hợp lệ (tự tham chiếu): ${item.id}`,
          );
        }
      }

      const payloadById = new Map<string, ReorderItemDto>();
      for (const item of items) payloadById.set(item.id, item);

      const effectiveParentId = (id: string): string | null => {
        const item = payloadById.get(id);
        if (item && item.parentId !== undefined) return item.parentId ?? null;
        return existingMap.get(id)?.parentId ?? null;
      };

      const isCycle = (startId: string): boolean => {
        const visited = new Set<string>();
        let cur: string | null = effectiveParentId(startId);
        while (cur) {
          if (cur === startId) return true;
          if (visited.has(cur)) return true;
          visited.add(cur);
          cur = effectiveParentId(cur);
        }
        return false;
      };

      for (const item of items) {
        if (isCycle(item.id)) {
          throw new BadRequestException(`parentId tạo vòng lặp: ${item.id}`);
        }
      }

      const ROOT = '__root__';

      const affectedParents = new Set<string>();
      for (const item of items) {
        const oldParent = existingMap.get(item.id)?.parentId ?? null;
        const newParent = effectiveParentId(item.id);
        affectedParents.add(oldParent ?? ROOT);
        affectedParents.add(newParent ?? ROOT);
      }

      const payloadOrderByParent = new Map<string, string[]>();
      for (const item of items) {
        const parent = effectiveParentId(item.id);
        const key = parent ?? ROOT;
        const arr = payloadOrderByParent.get(key) ?? [];
        arr.push(item.id);
        payloadOrderByParent.set(key, arr);
      }

      for (const parentKey of affectedParents) {
        const parentId = parentKey === ROOT ? null : parentKey;
        const payloadIds = payloadOrderByParent.get(parentKey) ?? [];
        const payloadIdSet = new Set(payloadIds);

        const siblings = existing
          .filter((row) => effectiveParentId(row.id) === parentId)
          .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id.localeCompare(b.id);
          })
          .map((row) => row.id);
        const finalIds = [...siblings];
        const payloadPositions: number[] = [];
        for (let idx = 0; idx < siblings.length; idx++) {
          if (payloadIdSet.has(siblings[idx])) {
            payloadPositions.push(idx);
          }
        }
        for (let idx = 0; idx < payloadPositions.length; idx++) {
          finalIds[payloadPositions[idx]] = payloadIds[idx];
        }

        for (let idx = 0; idx < finalIds.length; idx++) {
          const id = finalIds[idx];
          const payloadItem = payloadById.get(id);
          const updateData: any = { sortOrder: idx };
          if (payloadItem && payloadItem.parentId !== undefined) {
            updateData.parentId = effectiveParentId(id);
          }
          await repo.update({ id }, updateData);
        }
      }
    });
    return { ok: true };
  }

  async findAllCatalogEntries(query: IndicatorCatalogQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 200);
    const skip = (page - 1) * limit;

    const qb = this.catalogRepo.createQueryBuilder('cat');

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(cat.name) LIKE :q OR LOWER(cat.code) LIKE :q)', {
        q,
      });
    }

    qb.orderBy('cat.name', 'ASC').skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows,
      meta: { page, limit, total },
    };
  }

  async createCatalogEntry(
    dto: CreateIndicatorCatalogDto,
    userId: string | undefined,
  ) {
    const code = dto.code.trim();
    const dup = await this.catalogRepo.exist({
      where: { code: ILike(code) },
    });
    if (dup) throw new ConflictException('CATALOG_CODE_DUPLICATE');
    const row = this.catalogRepo.create({
      code,
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
    if (!row)
      throw new NotFoundException('Không tìm thấy chỉ tiêu trong danh mục');

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (code !== row.code) {
        const dup = await this.catalogRepo.exist({ where: { code: ILike(code) } });
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
    if (!row)
      throw new NotFoundException('Không tìm thấy chỉ tiêu trong danh mục');

    // Check if being used in any form indicators
    const used = await this.indRepo.exist({
      where: { catalogIndicatorId: id },
    });
    if (used) {
      throw new ConflictException('CATALOG_ENTRY_IN_USE');
    }

    await this.catalogRepo.remove(row);
    return { ok: true };
  }

  async findAllFieldCategories(query: FieldCategoryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 200);
    const isGetAll = query.isGetAll === true;
    const skip = (page - 1) * limit;
    const qb = this.fieldCategoryRepo.createQueryBuilder('c');

    const status = query.status ?? query.isActive;
    if (status !== undefined) {
      qb.andWhere('c.isActive = :ia', { ia: status });
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(c.name) LIKE :q OR LOWER(c.code) LIKE :q)', { q });
    }

    qb.orderBy('c.sort_order', 'ASC').addOrderBy('c.name', 'ASC');
    if (!isGetAll) {
      qb.skip(skip).take(limit);
    }

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
      meta: isGetAll ? { total } : { page, limit, total },
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

  async removeFieldCategory(id: string) {
    const row = await this.fieldCategoryRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy lĩnh vực');

    const used = await this.formRepo
      .createQueryBuilder('f')
      .where('f.deleted_at IS NULL')
      .andWhere('f.field_category_id = :id', { id })
      .getExists();
    if (used) throw new ConflictException('FIELD_CATEGORY_IN_USE');

    await this.fieldCategoryRepo.remove(row);
    return { ok: true };
  }

  async listTemplateScopes(formId: string) {
    await this.ensureForm(formId);
    const items = await this.templateScopeRepo.find({
      where: { templateId: formId, isEnabled: true },
      order: { createdAt: 'ASC' },
    });
    return {
      items: items.map((x) => ({
        id: x.id,
        orgId: x.orgId,
        indicatorId: x.indicatorId,
      })),
    };
  }

  async upsertTemplateScopes(formId: string, dto: UpsertTemplateScopesDto) {
    await this.ensureTemplateStructureEditable(formId);
    const form = await this.ensureForm(formId);
    const indicatorSet = new Set(
      (await this.indRepo.find({ where: { formId }, select: { id: true } })).map(
        (x) => x.id,
      ),
    );
    const orgSet = new Set(
      (await this.dataSource.query<{ id: string }[]>(
        'SELECT id FROM organizations WHERE deleted_at IS NULL AND is_active = true',
      )).map((x) => x.id),
    );
    for (const item of dto.items) {
      if (!indicatorSet.has(item.indicatorId)) {
        throw new BadRequestException(`indicatorId không thuộc form: ${item.indicatorId}`);
      }
      if (!orgSet.has(item.orgId)) {
        throw new BadRequestException(`orgId không hợp lệ hoặc không active: ${item.orgId}`);
      }
    }

    // Enforce templateType UNIQUE: cùng 1 indicator chỉ được gán cho 1 org
    if (form.templateType === TemplateType.UNIQUE) {
      const existingRules = await this.templateScopeRepo.find({
        where: { templateId: formId, isEnabled: true },
        select: { indicatorId: true, orgId: true },
      });
      // Tạo map: indicatorId → orgId hiện tại
      const indicatorOrgMap = new Map<string, string>();
      for (const rule of existingRules) {
        indicatorOrgMap.set(rule.indicatorId, rule.orgId);
      }
      for (const item of dto.items) {
        const currentOrgId = indicatorOrgMap.get(item.indicatorId);
        if (currentOrgId && currentOrgId !== item.orgId) {
          throw new ConflictException(
            `UNIQUE_TEMPLATE_INDICATOR_CONFLICT: Chỉ tiêu ${item.indicatorId} đã được gán cho đơn vị khác`,
          );
        }
        // Cập nhật map với item mới để validate nội bộ batch
        indicatorOrgMap.set(item.indicatorId, item.orgId);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FormTemplateIndicatorOrgRule);
      for (const item of dto.items) {
        const existing = await repo.findOne({
          where: {
            templateId: formId,
            orgId: item.orgId,
            indicatorId: item.indicatorId,
          },
        });
        if (existing) {
          existing.isEnabled = true;
          await repo.save(existing);
          continue;
        }
        await repo.save(
          repo.create({
            templateId: formId,
            orgId: item.orgId,
            indicatorId: item.indicatorId,
            isEnabled: true,
          }),
        );
      }
    });
    return { ok: true };
  }

  async deleteTemplateScopes(formId: string, dto: UpsertTemplateScopesDto) {
    await this.ensureTemplateStructureEditable(formId);
    await this.ensureForm(formId);
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FormTemplateIndicatorOrgRule);
      for (const item of dto.items) {
        await repo.delete({
          templateId: formId,
          orgId: item.orgId,
          indicatorId: item.indicatorId,
        });
      }
    });
    return { ok: true };
  }

  private async requireActiveFieldCategory(id: string): Promise<FieldCategory> {
    const row = await this.fieldCategoryRepo.findOne({
      where: { id, isActive: true },
    });
    if (!row) {
      throw new BadRequestException(
        'fieldCategoryRef không tồn tại, không hợp lệ hoặc đã ngưng sử dụng',
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




