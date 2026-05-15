import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  AssignmentBatch,
  AssignmentBatchStatus,
} from '../report-campaign/assignment/entities/assignment-batch.entity';
import {
  AssignmentIndicatorScope,
  AssignmentIndicatorScopeSource,
} from '../report-campaign/assignment/entities/assignment-indicator-scope.entity';
import { FormAssignment } from '../report-campaign/assignment/entities/form-assignment.entity';
import { Form } from '../template-management/entities/form.entity';
import {
  TemplateStatus,
  TemplateType,
} from '../template-management/entities/form.entity';
import { FormIndicator } from '../template-management/entities/form-indicator.entity';
import { FormTemplateIndicatorOrgRule } from '../template-management/entities/form-template-indicator-org-rule.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ReportCampaignDefaultValue } from './entities/report-campaign-default-value.entity';
import { FormAttribute } from '../template-management/entities/form-attribute.entity';
import { ReportSubmission } from '../submission/entities/report-submission.entity';
import { CreateReportCampaignDto } from './dto/create-report-campaign.dto';
import { UpdateReportCampaignDto } from './dto/update-report-campaign.dto';
import { UpsertReportCampaignScopesDto } from './dto/upsert-report-campaign-scopes.dto';
import { ReportCampaignQueryDto } from './dto/report-campaign-query.dto';
import {
  UpsertCampaignDefaultValuesDto,
  DeleteCampaignDefaultValuesDto,
} from './dto/upsert-campaign-default-values.dto';
import { normalizeSubmissionStatus } from '../submission/submission-status';

type CampaignAssignmentRow = {
  assignmentId: string;
  batchId: string | null;
  formId: string;
  orgId: string;
  orgName: string | null;
  periodType: string;
  periodCode: string;
  periodName: string | null;
  deadlineFrom: string;
  deadlineTo: string;
  assignedAt: Date | string | null;
  assignedBy: string | null;
  submissionId: string | null;
  submissionStatus: string | null;
  completionPct: string | number | null;
  submittedAt: Date | string | null;
  departmentApprovedAt: Date | string | null;
  districtApprovedAt: Date | string | null;
  submissionUpdatedAt: Date | string | null;
};

type CampaignAssignmentReadiness = {
  id: string;
  orgId: string;
  orgName: string;
  submissionId: string | null;
  status: string;
  updatedAt: string | null;
};

type CampaignSummaryPreview = {
  id: string;
  formId: string;
  periodType: string;
  periodCode: string | null;
  periodName: string | null;
  periodFrom: string;
  periodTo: string;
  orgId: string;
  status: string;
  totalUnits: number | null;
  submittedUnits: number | null;
  approvedUnits: number | null;
  summaryData: Record<string, unknown>;
  summarizedAt: string;
  createdAt: string;
};

@Injectable()
export class ReportCampaignService {
  constructor(
    @InjectRepository(AssignmentBatch)
    private readonly batchRepo: Repository<AssignmentBatch>,
    @InjectRepository(AssignmentIndicatorScope)
    private readonly scopeRepo: Repository<AssignmentIndicatorScope>,
    @InjectRepository(FormAssignment)
    private readonly assignmentRepo: Repository<FormAssignment>,
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormIndicator)
    private readonly indicatorRepo: Repository<FormIndicator>,
    @InjectRepository(FormTemplateIndicatorOrgRule)
    private readonly templateScopeRepo: Repository<FormTemplateIndicatorOrgRule>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(ReportCampaignDefaultValue)
    private readonly defaultValueRepo: Repository<ReportCampaignDefaultValue>,
    @InjectRepository(FormAttribute)
    private readonly attributeRepo: Repository<FormAttribute>,
    @InjectRepository(ReportSubmission)
    private readonly submissionRepo: Repository<ReportSubmission>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ReportCampaignQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;
    const qb = this.batchRepo.createQueryBuilder('c');
    if (query.formId)
      qb.andWhere('c.formId = :formId', { formId: query.formId });
    if (query.status) qb.andWhere('c.status = :st', { st: query.status });
    if (query.periodType)
      qb.andWhere('c.periodType = :pt', { pt: query.periodType });
    if (query.periodCode?.trim()) {
      qb.andWhere('c.periodCode = :pc', { pc: query.periodCode.trim() });
    }
    qb.orderBy('c.createdAt', 'DESC').skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async create(dto: CreateReportCampaignDto, userId: string | undefined) {
    const form = await this.formRepo.findOne({ where: { id: dto.formId } });
    if (!form) throw new NotFoundException('FORM_NOT_FOUND');
    if (!form.isActive) throw new ConflictException('FORM_INACTIVE');
    if (
      ![TemplateStatus.READY, TemplateStatus.IN_USE].includes(
        form.templateStatus,
      )
    ) {
      throw new ConflictException('FORM_NOT_READY_FOR_CAMPAIGN');
    }

    const periodCode = dto.periodCode.trim();
    if (!periodCode) throw new BadRequestException('PERIOD_CODE_REQUIRED');

    const exists = await this.batchRepo.exist({
      where: { formId: dto.formId, periodType: dto.periodType, periodCode },
    });
    if (exists) throw new ConflictException('CAMPAIGN_DUPLICATE');

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        formId: dto.formId,
        periodType: dto.periodType,
        periodCode,
        periodName: dto.periodName?.trim() || null,
        deadlineFrom: dto.deadlineFrom.slice(0, 10),
        deadlineTo: dto.deadlineTo.slice(0, 10),
        createdBy: userId ?? null,
        status: AssignmentBatchStatus.DRAFT,
      }),
    );

    const defaults = await this.templateScopeRepo.find({
      where: { templateId: dto.formId, isEnabled: true },
      select: { orgId: true, indicatorId: true },
    });

    if (defaults.length > 0) {
      await this.scopeRepo.save(
        defaults.map((d) =>
          this.scopeRepo.create({
            batchId: batch.id,
            orgId: d.orgId,
            indicatorId: d.indicatorId,
            source: AssignmentIndicatorScopeSource.TEMPLATE_DEFAULT,
          }),
        ),
      );
    }

    if (form.templateStatus === TemplateStatus.READY) {
      form.templateStatus = TemplateStatus.IN_USE;
      await this.formRepo.save(form);
    }

    return { id: batch.id, status: batch.status };
  }

  async findOne(id: string) {
    const campaign = await this.batchRepo.findOne({
      where: { id },
      relations: ['form'],
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');

    const { form, ...campaignData } = campaign;
    const templateCode = form?.code;
    const templateName = form?.name;

    return {
      ...campaignData,
      templateCode,
      templateName,
    };
  }

  async listAssignments(campaignId: string) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');

    const rows = await this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoin(Organization, 'o', 'o.id = a.orgId')
      .leftJoin(ReportSubmission, 's', 's.assignmentId = a.id')
      .where('a.batchId = :campaignId', { campaignId })
      .andWhere('a.isCancelled = false')
      .select([
        'a.id AS "assignmentId"',
        'a.batchId AS "batchId"',
        'a.formId AS "formId"',
        'a.orgId AS "orgId"',
        'o.name AS "orgName"',
        'a.periodType AS "periodType"',
        'a.periodCode AS "periodCode"',
        'a.periodName AS "periodName"',
        'a.deadlineFrom AS "deadlineFrom"',
        'a.deadlineTo AS "deadlineTo"',
        'a.assignedAt AS "assignedAt"',
        'a.assignedBy AS "assignedBy"',
        's.id AS "submissionId"',
        's.status AS "submissionStatus"',
        's.completion_pct AS "completionPct"',
        's.submitted_at AS "submittedAt"',
        's.department_approved_at AS "departmentApprovedAt"',
        's.district_approved_at AS "districtApprovedAt"',
        's.updated_at AS "submissionUpdatedAt"',
      ])
      .orderBy('o.name', 'ASC')
      .addOrderBy('a.assignedAt', 'ASC')
      .getRawMany<CampaignAssignmentRow>();

    return {
      items: rows.map((row) => {
        const submissionId = row.submissionId ?? null;
        const submissionStatus = submissionId
          ? normalizeSubmissionStatus(row.submissionStatus)
          : 'NOT_STARTED';
        return {
          id: row.assignmentId,
          batchId: row.batchId,
          formId: row.formId,
          orgId: row.orgId,
          orgName: row.orgName ?? '',
          periodType: row.periodType,
          periodCode: row.periodCode,
          periodName: row.periodName ?? null,
          deadlineFrom: row.deadlineFrom,
          deadlineTo: row.deadlineTo,
          assignedAt: row.assignedAt ?? null,
          assignedBy: row.assignedBy ?? null,
          submissionId,
          status: submissionStatus,
          completionPct:
            row.completionPct != null ? Number(row.completionPct) : null,
          submittedAt: row.submittedAt ?? null,
          approvedAt:
            row.districtApprovedAt ?? row.departmentApprovedAt ?? null,
          departmentApprovedAt: row.departmentApprovedAt ?? null,
          districtApprovedAt: row.districtApprovedAt ?? null,
          updatedAt: row.submissionUpdatedAt ?? row.assignedAt ?? null,
        };
      }),
    };
  }

  async getSummaryReadiness(campaignId: string) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');

    const assignments = await this.listAssignments(campaignId);
    const items = assignments.items.map((item) => ({
      id: item.id,
      orgId: item.orgId,
      orgName: item.orgName,
      submissionId: item.submissionId ?? null,
      status: item.status,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    })) satisfies CampaignAssignmentReadiness[];

    const readyItems = items.filter(
      (item) => item.status === 'DISTRICT_APPROVED',
    );
    const blockedItems = items.filter(
      (item) => item.status !== 'DISTRICT_APPROVED',
    );

    return {
      campaignId: campaign.id,
      totalAssignments: items.length,
      readyAssignments: readyItems.length,
      blockedAssignments: blockedItems,
      canAggregate: items.length > 0 && blockedItems.length === 0,
      campaignStatus: campaign.status,
    };
  }

  async getSummaryPreview(campaignId: string) {
    return await this.buildSummaryPreview(campaignId);
  }

  async recomputeSummary(campaignId: string) {
    return await this.buildSummaryPreview(campaignId);
  }

  async getAssignmentAdminView(campaignId: string, assignmentId: string) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, batchId: campaignId, isCancelled: false },
    });
    if (!assignment) throw new NotFoundException('ASSIGNMENT_NOT_FOUND');

    const submission = await this.submissionRepo.findOne({
      where: { assignmentId: assignment.id },
    });
    if (!submission) throw new NotFoundException('SUBMISSION_NOT_FOUND');

    const cells = (await this.dataSource.query(
      `SELECT indicator_id, attribute_id, value_text, value_number, updated_by, updated_at
       FROM report_submission_cells
       WHERE submission_id = $1
       ORDER BY indicator_id ASC, attribute_id ASC`,
      [submission.id],
    )) as unknown as Array<{
      indicator_id: string;
      attribute_id: string;
      value_text: string | null;
      value_number: string | number | null;
      updated_by: string | null;
      updated_at: Date | string;
    }>;

    let defaultValues: Array<{
      indicatorId: string;
      attributeId: string;
      valueText: string | null;
      valueNumber: number | null;
    }> = [];
    if (assignment.batchId) {
      const rows = (await this.dataSource.query(
        `SELECT indicator_id, attribute_id, value_text, value_number
         FROM report_campaign_default_values
         WHERE campaign_id = $1
         ORDER BY indicator_id ASC, attribute_id ASC`,
        [assignment.batchId],
      )) as unknown as Array<{
        indicator_id: string;
        attribute_id: string;
        value_text: string | null;
        value_number: string | number | null;
      }>;
      defaultValues = rows.map((r) => ({
        indicatorId: r.indicator_id,
        attributeId: r.attribute_id,
        valueText: r.value_text,
        valueNumber: r.value_number != null ? Number(r.value_number) : null,
      }));
    }

    return {
      id: submission.id,
      code: submission.code,
      assignmentId: submission.assignmentId,
      status: normalizeSubmissionStatus(submission.status),
      version: submission.version,
      note: submission.note,
      rejectReason: submission.rejectReason,
      completionPct:
        submission.completionPct != null
          ? Number(submission.completionPct)
          : null,
      submittedAt: submission.submittedAt
        ? submission.submittedAt.toISOString()
        : null,
      defaultValues,
      cells: cells.map((c) => ({
        indicatorId: c.indicator_id,
        attributeId: c.attribute_id,
        valueText: c.value_text,
        valueNumber: c.value_number != null ? Number(c.value_number) : null,
        updatedBy: c.updated_by,
        updatedAt: new Date(c.updated_at).toISOString(),
      })),
    };
  }

  private async buildSummaryPreview(
    campaignId: string,
  ): Promise<CampaignSummaryPreview> {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');

    const assignments = await this.listAssignments(campaignId);
    const approvedAssignments = assignments.items.filter(
      (item) => item.status === 'DISTRICT_APPROVED',
    );
    const approvedDetails = await Promise.all(
      approvedAssignments.map((assignment) =>
        this.getAssignmentAdminView(campaignId, assignment.id),
      ),
    );

    const defaultValueRows = await this.defaultValueRepo.find({
      where: { campaignId },
      order: { indicatorId: 'ASC', attributeId: 'ASC' },
    });

    const mergedData = new Map<
      string,
      { valueText: string | null; valueNumber: number | null }
    >();

    for (const detail of approvedDetails) {
      for (const cell of detail.cells) {
        const key = `${cell.indicatorId}:${cell.attributeId}`;
        const existing = mergedData.get(key) ?? {
          valueText: null,
          valueNumber: null,
        };
        const nextValueNumber =
          cell.valueNumber === null || cell.valueNumber === undefined
            ? null
            : Number(cell.valueNumber);

        mergedData.set(key, {
          valueText: cell.valueText ?? existing.valueText,
          valueNumber:
            existing.valueNumber != null || nextValueNumber != null
              ? (existing.valueNumber ?? 0) + (nextValueNumber ?? 0)
              : null,
        });
      }
    }

    for (const row of defaultValueRows) {
      const key = `${row.indicatorId}:${row.attributeId}`;
      mergedData.set(key, {
        valueText: row.valueText,
        valueNumber:
          row.valueNumber === null || row.valueNumber === undefined
            ? null
            : Number(row.valueNumber),
      });
    }

    const indicators: Record<
      string,
      { valueText: string | null; valueNumber: number | null }
    > = {};
    for (const [key, value] of mergedData.entries()) {
      indicators[key] = value;
    }

    const recomputedAt = new Date().toISOString();
    const summaryData: Record<string, unknown> = {
      indicators,
      recomputedAt,
      source: 'campaign-preview',
      approvedAssignmentIds: approvedAssignments.map((item) => item.id),
    };

    const summaryOrgId =
      approvedAssignments[0]?.orgId ??
      assignments.items[0]?.orgId ??
      campaign.formId;

    return {
      id: campaign.id,
      formId: campaign.formId,
      periodType: campaign.periodType,
      periodCode: campaign.periodCode,
      periodName: campaign.periodName,
      periodFrom: campaign.deadlineFrom,
      periodTo: campaign.deadlineTo,
      orgId: summaryOrgId,
      status: approvedAssignments.length > 0 ? 'FINAL' : 'DRAFT',
      totalUnits: assignments.items.length,
      submittedUnits: assignments.items.filter((item) => item.submissionId).length,
      approvedUnits: approvedAssignments.length,
      summaryData,
      summarizedAt: recomputedAt,
      createdAt: campaign.createdAt.toISOString(),
    };
  }

  async patch(id: string, dto: UpdateReportCampaignDto) {
    const campaign = await this.batchRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }
    if (dto.periodName !== undefined)
      campaign.periodName = dto.periodName?.trim() || null;
    if (dto.deadlineFrom !== undefined)
      campaign.deadlineFrom = dto.deadlineFrom.slice(0, 10);
    if (dto.deadlineTo !== undefined)
      campaign.deadlineTo = dto.deadlineTo.slice(0, 10);
    if (campaign.deadlineTo < campaign.deadlineFrom) {
      throw new BadRequestException('DEADLINE_INVALID_RANGE');
    }
    await this.batchRepo.save(campaign);
    return { ok: true };
  }

  async listScopes(campaignId: string) {
    const rows = await this.scopeRepo
      .createQueryBuilder('s')
      .innerJoin(Organization, 'o', 'o.id = s.orgId')
      .innerJoin(FormIndicator, 'i', 'i.id = s.indicatorId')
      .where('s.batchId = :campaignId', { campaignId })
      .select([
        's.id AS "id"',
        's.orgId AS "orgId"',
        'o.code AS "orgCode"',
        'o.name AS "orgName"',
        's.indicatorId AS "indicatorId"',
        'i.code AS "indicatorCode"',
        'i.name AS "indicatorName"',
        's.source AS "source"',
      ])
      .getRawMany();

    return {
      items: rows.map((x) => ({
        id: x.id,
        orgId: x.orgId,
        orgCode: x.orgCode,
        orgName: x.orgName,
        indicatorId: x.indicatorId,
        indicatorCode: x.indicatorCode,
        indicatorName: x.indicatorName,
        source: x.source,
      })),
    };
  }

  async upsertScopes(campaignId: string, dto: UpsertReportCampaignScopesDto) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }

    const orgIds = [...new Set(dto.items.map((x) => x.orgId))];
    const indicatorIds = [...new Set(dto.items.map((x) => x.indicatorId))];

    const orgs = await this.orgRepo.find({
      where: { id: In(orgIds) },
      select: { id: true, isActive: true },
    });
    if (orgs.length !== orgIds.length || orgs.some((x) => !x.isActive)) {
      throw new BadRequestException('INVALID_ORGS');
    }

    const indicators = await this.indicatorRepo.find({
      where: { id: In(indicatorIds), formId: campaign.formId },
      select: { id: true },
    });
    if (indicators.length !== indicatorIds.length) {
      throw new BadRequestException('INVALID_INDICATORS');
    }

    const form = await this.formRepo.findOne({
      where: { id: campaign.formId },
    });
    if (!form) throw new NotFoundException('FORM_NOT_FOUND');

    if (form.templateType === TemplateType.UNIQUE) {
      const seen = new Set<string>();
      for (const item of dto.items) {
        if (seen.has(item.indicatorId)) {
          throw new ConflictException('UNIQUE_TEMPLATE_INDICATOR_CONFLICT');
        }
        seen.add(item.indicatorId);
      }
    }

    for (const item of dto.items) {
      const existing = await this.scopeRepo.findOne({
        where: {
          batchId: campaignId,
          orgId: item.orgId,
          indicatorId: item.indicatorId,
        },
      });
      if (existing) continue;
      await this.scopeRepo.save(
        this.scopeRepo.create({
          batchId: campaignId,
          orgId: item.orgId,
          indicatorId: item.indicatorId,
          source: AssignmentIndicatorScopeSource.CAMPAIGN_OVERRIDE,
        }),
      );
    }

    return { ok: true };
  }

  async deleteScopes(campaignId: string, dto: UpsertReportCampaignScopesDto) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }

    for (const item of dto.items) {
      await this.scopeRepo.delete({
        batchId: campaignId,
        orgId: item.orgId,
        indicatorId: item.indicatorId,
      });
    }
    return { ok: true };
  }

  async confirmDispatch(campaignId: string, userId: string | undefined) {
    return await this.dataSource.transaction(async (manager) => {
      const campaignRepo = manager.getRepository(AssignmentBatch);
      const scopeRepo = manager.getRepository(AssignmentIndicatorScope);
      const assignmentRepo = manager.getRepository(FormAssignment);

      const campaign = await campaignRepo.findOne({
        where: { id: campaignId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');

      // Idempotent retry: if already dispatched, return success.
      if (campaign.status === AssignmentBatchStatus.DISPATCHED) {
        return { ok: true, status: campaign.status };
      }
      if (campaign.status !== AssignmentBatchStatus.DRAFT) {
        throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
      }

      const scopes = await scopeRepo.find({ where: { batchId: campaignId } });
      if (scopes.length === 0)
        throw new BadRequestException('CAMPAIGN_SCOPE_EMPTY');

      const orgIds = [...new Set(scopes.map((x) => x.orgId))];
      for (const orgId of orgIds) {
        const exists = await assignmentRepo.exist({
          where: { batchId: campaignId, orgId, isCancelled: false },
        });
        if (exists) continue;
        await assignmentRepo.save(
          assignmentRepo.create({
            batchId: campaign.id,
            formId: campaign.formId,
            orgId,
            periodType: campaign.periodType,
            periodCode: campaign.periodCode,
            periodName: campaign.periodName,
            deadlineFrom: campaign.deadlineFrom,
            deadlineTo: campaign.deadlineTo,
            isCancelled: false,
            cancelReason: null,
            assignedBy: userId ?? null,
          }),
        );
      }

      campaign.status = AssignmentBatchStatus.DISPATCHED;
      campaign.dispatchedAt = new Date();
      campaign.dispatchedBy = userId ?? null;
      await campaignRepo.save(campaign);

      return { ok: true, status: campaign.status };
    });
  }

  async cancel(campaignId: string, _userId: string | undefined) {
    void _userId;
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status === AssignmentBatchStatus.CANCELLED) {
      return { ok: true, status: campaign.status };
    }
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_CANCELLABLE');
    }
    campaign.status = AssignmentBatchStatus.CANCELLED;
    await this.batchRepo.save(campaign);
    return { ok: true, status: campaign.status };
  }

  async close(campaignId: string, _userId: string | undefined) {
    void _userId;
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status === AssignmentBatchStatus.CLOSED) {
      return { ok: true, status: campaign.status };
    }
    if (campaign.status !== AssignmentBatchStatus.DISPATCHED) {
      throw new ConflictException('CAMPAIGN_NOT_CLOSABLE');
    }
    campaign.status = AssignmentBatchStatus.CLOSED;
    await this.batchRepo.save(campaign);
    return { ok: true, status: campaign.status };
  }

  // ── DefaultValues CRUD ────────────────────────────────────────────

  async listDefaultValues(campaignId: string) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    const rows = await this.defaultValueRepo.find({
      where: { campaignId },
      order: { createdAt: 'ASC' },
    });
    return {
      items: rows.map((x) => ({
        id: x.id,
        indicatorId: x.indicatorId,
        attributeId: x.attributeId,
        valueText: x.valueText,
        valueNumber: x.valueNumber,
      })),
    };
  }

  async upsertDefaultValues(
    campaignId: string,
    dto: UpsertCampaignDefaultValuesDto,
  ) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }

    // Validate indicators belong to campaign's template
    const indicatorIds = [...new Set(dto.items.map((x) => x.indicatorId))];
    const indicators = await this.indicatorRepo.find({
      where: { id: In(indicatorIds), formId: campaign.formId },
      select: { id: true, type: true },
    });
    if (indicators.length !== indicatorIds.length) {
      throw new BadRequestException('INVALID_INDICATORS');
    }
    if (indicators.some((ind) => ind.type === 'TITLE')) {
      throw new BadRequestException(
        'CANNOT_SET_DEFAULT_VALUE_FOR_TITLE_INDICATOR',
      );
    }

    // Validate attributes belong to campaign's template
    const attributeIds = [...new Set(dto.items.map((x) => x.attributeId))];
    const attributes = await this.attributeRepo.find({
      where: { id: In(attributeIds), formId: campaign.formId },
      select: { id: true },
    });
    if (attributes.length !== attributeIds.length) {
      throw new BadRequestException('INVALID_ATTRIBUTES');
    }

    // Validate value theo dataType (query cell_config cho từng ô)
    for (const item of dto.items) {
      const cellConfig = await this.dataSource.query<
        { data_type: string | null }[]
      >(
        `SELECT data_type FROM form_template_cell_configs
         WHERE template_id = $1 AND indicator_id = $2 AND attribute_id = $3
         LIMIT 1`,
        [campaign.formId, item.indicatorId, item.attributeId],
      );
      const dataType = cellConfig?.[0]?.data_type ?? null;
      if (
        dataType === 'number' &&
        item.valueNumber == null &&
        !item.valueText
      ) {
        throw new BadRequestException(
          `Ô (${item.indicatorId}, ${item.attributeId}) kiểu số nhưng không có giá trị number`,
        );
      }
    }

    // Upsert
    for (const item of dto.items) {
      const existing = await this.defaultValueRepo.findOne({
        where: {
          campaignId,
          indicatorId: item.indicatorId,
          attributeId: item.attributeId,
        },
      });
      if (existing) {
        existing.valueText = item.valueText ?? null;
        existing.valueNumber =
          item.valueNumber != null ? String(item.valueNumber) : null;
        await this.defaultValueRepo.save(existing);
        continue;
      }
      await this.defaultValueRepo.save(
        this.defaultValueRepo.create({
          campaignId,
          indicatorId: item.indicatorId,
          attributeId: item.attributeId,
          valueText: item.valueText ?? null,
          valueNumber:
            item.valueNumber != null ? String(item.valueNumber) : null,
        }),
      );
    }

    return { ok: true };
  }

  async deleteDefaultValues(
    campaignId: string,
    dto: DeleteCampaignDefaultValuesDto,
  ) {
    const campaign = await this.batchRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }
    for (const item of dto.items) {
      await this.defaultValueRepo.delete({
        campaignId,
        indicatorId: item.indicatorId,
        attributeId: item.attributeId,
      });
    }
    return { ok: true };
  }
}
