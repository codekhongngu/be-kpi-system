import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FieldCategory } from '../template-management/entities/field-category.entity';
import { Form } from '../template-management/entities/form.entity';
import { FormIndicator } from '../template-management/entities/form-indicator.entity';
import { FormAttribute } from '../template-management/entities/form-attribute.entity';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { normalizeSubmissionStatus } from '../submission/submission-status';
import { DashboardFieldCategoriesQueryDto } from './dto/dashboard-field-categories-query.dto';
import { DashboardFieldReportsQueryDto } from './dto/dashboard-field-reports-query.dto';

type EnrichedCellRow = {
  indicatorId: string;
  attributeId: string;
  code: string | null;
  attributeName: string | null;
  valueText: string | null;
  valueNumber: number | null;
};

type AssignmentReportRow = {
  assignmentId: string;
  submissionId: string | null;
  submissionCode: string | null;
  submissionStatus: string | null;
  completionPct: string | number | null;
  submittedAt: Date | null;
  departmentApprovedAt: Date | null;
  districtApprovedAt: Date | null;
  orgId: string;
  orgCode: string;
  orgName: string;
  periodType: string;
  periodCode: string;
  periodName: string | null;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(FieldCategory)
    private readonly fieldCategoryRepo: Repository<FieldCategory>,
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormIndicator)
    private readonly indicatorRepo: Repository<FormIndicator>,
    @InjectRepository(FormAttribute)
    private readonly attributeRepo: Repository<FormAttribute>,
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  async listFieldCategoriesWithTemplates(query: DashboardFieldCategoriesQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 200);
    const isGetAll = query.isGetAll === true;
    const skip = (page - 1) * limit;

    const qb = this.fieldCategoryRepo.createQueryBuilder('c');

    if (query.isActive !== undefined) {
      qb.andWhere('c.is_active = :isActive', { isActive: query.isActive });
    } else {
      qb.andWhere('c.is_active = true');
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(c.name) LIKE :q OR LOWER(c.code) LIKE :q)', { q });
    }

    qb.orderBy('c.sort_order', 'ASC').addOrderBy('c.name', 'ASC');
    if (!isGetAll) {
      qb.skip(skip).take(limit);
    }

    const [categories, total] = await qb.getManyAndCount();
    const categoryIds = categories.map((c) => c.id);

    const templatesByCategoryId = new Map<
      string,
      Array<{
        id: string;
        code: string;
        name: string;
        templateType: string;
        templateStatus: string;
        periodType: string;
      }>
    >();

    for (const id of categoryIds) {
      templatesByCategoryId.set(id, []);
    }

    if (categoryIds.length > 0) {
      const formRows = (await this.dataSource.query(
        `SELECT id, code, name, template_type, template_status, period_type, field_category_id
         FROM form_templates
         WHERE field_category_id = ANY($1::uuid[]) AND deleted_at IS NULL
         ORDER BY name ASC`,
        [categoryIds],
      )) as Array<{
        id: string;
        code: string;
        name: string;
        template_type: string;
        template_status: string;
        period_type: string;
        field_category_id: string;
      }>;

      for (const row of formRows) {
        const list = templatesByCategoryId.get(row.field_category_id) ?? [];
        list.push({
          id: row.id,
          code: row.code,
          name: row.name,
          templateType: row.template_type,
          templateStatus: row.template_status,
          periodType: row.period_type,
        });
        templatesByCategoryId.set(row.field_category_id, list);
      }
    }

    const items = categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      templates: templatesByCategoryId.get(c.id) ?? [],
    }));

    return {
      items,
      meta: isGetAll ? { total } : { page, limit, total },
    };
  }

  async getFieldCategoryReports(
    fieldCategoryId: string,
    query: DashboardFieldReportsQueryDto,
  ) {
    const periodCode = query.periodCode?.trim();
    if (!periodCode) {
      throw new BadRequestException('periodCode là bắt buộc');
    }

    const fieldCategory = await this.fieldCategoryRepo.findOne({
      where: { id: fieldCategoryId, isActive: true },
    });
    if (!fieldCategory) {
      throw new NotFoundException('Không tìm thấy lĩnh vực');
    }

    const form = await this.formRepo
      .createQueryBuilder('f')
      .where('f.id = :templateId', { templateId: query.templateId })
      .andWhere('f.field_category_id = :fieldCategoryId', { fieldCategoryId })
      .andWhere('f.deleted_at IS NULL')
      .getOne();

    if (!form) {
      throw new NotFoundException(
        'Không tìm thấy template hoặc template không thuộc lĩnh vực đã chọn',
      );
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const baseQb = this.buildAssignmentQueryBase(form.id, periodCode, query);

    const total = await baseQb.clone().getCount();

    const listQb = baseQb
      .clone()
      .select([
        'a.id AS "assignmentId"',
        's.id AS "submissionId"',
        's.code AS "submissionCode"',
        's.status AS "submissionStatus"',
        's.completion_pct AS "completionPct"',
        's.submitted_at AS "submittedAt"',
        's.department_approved_at AS "departmentApprovedAt"',
        's.district_approved_at AS "districtApprovedAt"',
        'o.id AS "orgId"',
        'o.code AS "orgCode"',
        'o.name AS "orgName"',
        'a.period_type AS "periodType"',
        'a.period_code AS "periodCode"',
        'a.period_name AS "periodName"',
      ])
      .orderBy('o.name', 'ASC')
      .addOrderBy('a.assigned_at', 'ASC')
      .offset(skip)
      .limit(limit);

    const rows = await listQb.getRawMany<AssignmentReportRow>();
    const submissionIds = rows
      .map((r) => r.submissionId)
      .filter((id): id is string => Boolean(id));

    const [indicators, attributes] = await Promise.all([
      this.indicatorRepo.find({
        where: { formId: form.id },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
      this.attributeRepo.find({
        where: { formId: form.id },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
    ]);

    const cellsBySubmission =
      await this.loadCellsBySubmission(submissionIds);

    const periodName =
      rows.find((r) => r.periodName)?.periodName ??
      rows[0]?.periodName ??
      null;
    const periodType =
      query.periodType ?? rows[0]?.periodType ?? form.periodType;

    return {
      context: {
        fieldCategory: {
          id: fieldCategory.id,
          code: fieldCategory.code,
          name: fieldCategory.name,
        },
        template: {
          id: form.id,
          code: form.code,
          name: form.name,
          templateType: form.templateType,
          templateStatus: form.templateStatus,
          periodType: form.periodType,
        },
        period: {
          type: periodType,
          code: periodCode,
          name: periodName,
        },
        filters: {
          status: query.status
            ? normalizeSubmissionStatus(query.status)
            : null,
          templateId: form.id,
          orgId: query.orgId ?? null,
        },
      },
      schema: {
        indicators: indicators.map((i) => ({
          id: i.id,
          parentId: i.parentId,
          displayIndex: i.displayIndex,
          code: i.code,
          name: i.name,
          unit: i.unit,
          dataType: i.dataType,
          type: i.type,
          sortOrder: i.sortOrder,
        })),
        attributes: attributes.map((a) => ({
          id: a.id,
          parentId: a.parentId,
          name: a.name,
          sortOrder: a.sortOrder,
          isSystem: a.isSystem,
        })),
      },
      reports: {
        items: rows.map((r) => {
          const status = r.submissionId
            ? normalizeSubmissionStatus(r.submissionStatus)
            : 'NOT_STARTED';
          return {
            assignmentId: r.assignmentId,
            submissionId: r.submissionId,
            code: r.submissionCode,
            status,
            org: {
              id: r.orgId,
              code: r.orgCode,
              name: r.orgName,
            },
            completionPct:
              r.completionPct != null ? Number(r.completionPct) : null,
            submittedAt: r.submittedAt,
            departmentApprovedAt: r.departmentApprovedAt,
            districtApprovedAt: r.districtApprovedAt,
            cells: r.submissionId
              ? (cellsBySubmission.get(r.submissionId) ?? [])
              : [],
          };
        }),
        meta: { page, limit, total },
      },
    };
  }

  private buildAssignmentQueryBase(
    formId: string,
    periodCode: string,
    query: DashboardFieldReportsQueryDto,
  ) {
    const qb = this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoin('organizations', 'o', 'o.id = a.org_id')
      .leftJoin(
        ReportSubmission,
        's',
        `s.assignment_id = a.id AND s.id = (
          SELECT rs.id
          FROM report_submissions rs
          WHERE rs.assignment_id = a.id
          ORDER BY rs.created_at DESC
          LIMIT 1
        )`,
      )
      .where('a.template_id = :formId', { formId })
      .andWhere('a.period_code = :periodCode', { periodCode })
      .andWhere('a.is_cancelled = false');

    if (query.periodType) {
      qb.andWhere('a.period_type = :periodType', {
        periodType: query.periodType,
      });
    }

    if (query.orgId) {
      qb.andWhere('a.org_id = :orgId', { orgId: query.orgId });
    }

    const normalizedStatus = query.status
      ? normalizeSubmissionStatus(query.status)
      : null;

    if (normalizedStatus === 'NOT_STARTED') {
      qb.andWhere('s.id IS NULL');
    } else if (normalizedStatus) {
      qb.andWhere('s.status = :st', { st: normalizedStatus });
    }

    return qb;
  }

  private async loadCellsBySubmission(
    submissionIds: string[],
  ): Promise<Map<string, EnrichedCellRow[]>> {
    const map = new Map<string, EnrichedCellRow[]>();

    if (submissionIds.length === 0) {
      return map;
    }

    const rows = (await this.dataSource.query(
      `SELECT
         c.submission_id,
         c.indicator_id,
         c.attribute_id,
         c.value_text,
         c.value_number,
         i.code AS indicator_code,
         a.name AS attribute_name
       FROM report_submission_cells c
       INNER JOIN form_template_indicators i ON i.id = c.indicator_id
       INNER JOIN form_template_attributes a ON a.id = c.attribute_id
       WHERE c.submission_id = ANY($1::uuid[])
       ORDER BY c.submission_id ASC, i.sort_order ASC, i.code ASC, a.sort_order ASC, a.name ASC`,
      [submissionIds],
    )) as Array<{
      submission_id: string;
      indicator_id: string;
      attribute_id: string;
      value_text: string | null;
      value_number: string | number | null;
      indicator_code: string;
      attribute_name: string;
    }>;

    for (const row of rows) {
      const sid = row.submission_id;
      if (!map.has(sid)) {
        map.set(sid, []);
      }
      map.get(sid)!.push({
        indicatorId: row.indicator_id,
        attributeId: row.attribute_id,
        code: row.indicator_code,
        attributeName: row.attribute_name,
        valueText: row.value_text,
        valueNumber:
          row.value_number != null ? Number(row.value_number) : null,
      });
    }

    return map;
  }
}
