import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { CreateReportCampaignDto } from './dto/create-report-campaign.dto';
import { UpdateReportCampaignDto } from './dto/update-report-campaign.dto';
import { UpsertReportCampaignScopesDto } from './dto/upsert-report-campaign-scopes.dto';

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
  ) {}

  async create(dto: CreateReportCampaignDto, userId: string | undefined) {
    const form = await this.formRepo.findOne({ where: { id: dto.formId } });
    if (!form) throw new NotFoundException('FORM_NOT_FOUND');
    if (!form.isActive) throw new ConflictException('FORM_INACTIVE');
    if (![TemplateStatus.READY, TemplateStatus.IN_USE].includes(form.templateStatus)) {
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
    const campaign = await this.batchRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    return campaign;
  }

  async patch(id: string, dto: UpdateReportCampaignDto) {
    const campaign = await this.batchRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }
    if (dto.periodName !== undefined) campaign.periodName = dto.periodName?.trim() || null;
    if (dto.deadlineFrom !== undefined) campaign.deadlineFrom = dto.deadlineFrom.slice(0, 10);
    if (dto.deadlineTo !== undefined) campaign.deadlineTo = dto.deadlineTo.slice(0, 10);
    if (campaign.deadlineTo < campaign.deadlineFrom) {
      throw new BadRequestException('DEADLINE_INVALID_RANGE');
    }
    await this.batchRepo.save(campaign);
    return { ok: true };
  }

  async listScopes(campaignId: string) {
    const rows = await this.scopeRepo.find({ where: { batchId: campaignId } });
    return {
      items: rows.map((x) => ({
        id: x.id,
        orgId: x.orgId,
        indicatorId: x.indicatorId,
        source: x.source,
      })),
    };
  }

  async upsertScopes(campaignId: string, dto: UpsertReportCampaignScopesDto) {
    const campaign = await this.batchRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }

    const orgIds = [...new Set(dto.items.map((x) => x.orgId))];
    const indicatorIds = [...new Set(dto.items.map((x) => x.indicatorId))];

    const orgs = await this.orgRepo.find({ where: { id: In(orgIds) }, select: { id: true, isActive: true } });
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

    const form = await this.formRepo.findOne({ where: { id: campaign.formId } });
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
        where: { batchId: campaignId, orgId: item.orgId, indicatorId: item.indicatorId },
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
    const campaign = await this.batchRepo.findOne({ where: { id: campaignId } });
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
    const campaign = await this.batchRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    if (campaign.status !== AssignmentBatchStatus.DRAFT) {
      throw new ConflictException('CAMPAIGN_NOT_EDITABLE');
    }

    const scopes = await this.scopeRepo.find({ where: { batchId: campaignId } });
    if (scopes.length === 0) throw new BadRequestException('CAMPAIGN_SCOPE_EMPTY');

    const orgIds = [...new Set(scopes.map((x) => x.orgId))];
    for (const orgId of orgIds) {
      const exists = await this.assignmentRepo.exist({
        where: {
          formId: campaign.formId,
          orgId,
          periodType: campaign.periodType,
          periodCode: campaign.periodCode,
          isCancelled: false,
        },
      });
      if (exists) continue;
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
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
          autoAssign: false,
          assignedBy: userId ?? null,
        }),
      );
    }

    campaign.status = AssignmentBatchStatus.DISPATCHED;
    campaign.dispatchedAt = new Date();
    campaign.dispatchedBy = userId ?? null;
    await this.batchRepo.save(campaign);

    return { ok: true, status: campaign.status };
  }
}



