import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';

type OrgTreeNode = Organization & { children: OrgTreeNode[] };

@Injectable()
export class OrganizationService {
  private canAssignReportsColumn: boolean | null = null;
  private organizationClosureTable: boolean | null = null;

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  private async selectOrgColumns(qb: ReturnType<Repository<Organization>['createQueryBuilder']>) {
    qb.select([
      'o.id',
      'o.code',
      'o.name',
      'o.parentId',
      'o.level',
      'o.isActive',
      'o.canAssignReports',
      'o.description',
      'o.createdAt',
      'o.updatedAt',
      'o.deletedAt',
    ]);
  }

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const code = dto.code.trim();
    const exists = await this.orgRepo.exist({
      where: { code: ILike(code) },
      withDeleted: true,
    });
    if (exists) throw new ConflictException('Mã đơn vị đã tồn tại');

    if (dto.parentId) {
      await this.assertOrgExists(dto.parentId);
    }

    const org = this.orgRepo.create({
      code,
      name: dto.name,
      parentId: dto.parentId ?? null,
      level: dto.level ?? 1,
      isActive: true,
      canAssignReports: dto.canAssignReports ?? true,
      description: dto.description ?? null,
    });
    return await this.orgRepo.save(org);
  }

  async findAll(query: OrganizationQueryDto) {
    const qb = this.orgRepo.createQueryBuilder('o');
    await this.selectOrgColumns(qb);

    if (query.isActive !== undefined) {
      qb.andWhere('o.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.canAssignReports !== undefined) {
      qb.andWhere('o.canAssignReports = :car', { car: query.canAssignReports });
    }

    if (query.q) {
      qb.andWhere('(o.code ILIKE :q OR o.name ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    qb.orderBy('o.level', 'ASC').addOrderBy('o.code', 'ASC');

    const items = await qb.getMany();
    if (!query.tree) return { items };

    return { items: this.buildTree(items) };
  }

  async findOne(id: string): Promise<Organization> {
    const qb = this.orgRepo.createQueryBuilder('o').where('o.id = :id', { id });
    await this.selectOrgColumns(qb);
    const org = await qb.getOne();
    if (!org) throw new NotFoundException('Không tìm thấy đơn vị');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findOne(id);

    if (dto.code && dto.code !== org.code) {
      const code = dto.code.trim();
      const dup = await this.orgRepo
        .createQueryBuilder('o')
        .where('o.deleted_at IS NULL')
        .andWhere('o.id != :id', { id })
        .andWhere('o.code ILIKE :code', { code })
        .getExists();
      if (dup) throw new ConflictException('Mã đơn vị đã tồn tại');
      dto.code = code;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Không thể gán cha là chính nó');
      }
      if (dto.parentId) {
        await this.assertOrgExists(dto.parentId);
        await this.assertNoCycle(id, dto.parentId);
      }
    }

    Object.assign(org, {
      ...dto,
      parentId: dto.parentId !== undefined ? dto.parentId : org.parentId,
    });

    return await this.orgRepo.save(org);
  }

  async lock(id: string): Promise<{ ok: true }> {
    const org = await this.findOne(id);
    if (!org.isActive) return { ok: true };
    org.isActive = false;
    await this.orgRepo.save(org);
    return { ok: true };
  }

  async unlock(id: string): Promise<{ ok: true }> {
    const org = await this.findOne(id);
    if (org.isActive) return { ok: true };
    org.isActive = true;
    await this.orgRepo.save(org);
    return { ok: true };
  }

  async remove(id: string): Promise<{ ok: true }> {
    const org = await this.findOne(id);

    const childCount = await this.orgRepo.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException('ORG_DELETE_BLOCKED: Đơn vị còn đơn vị con');
    }

    const tablesToCheck = [
      { table: 'users', col: 'org_id' },
      { table: 'report_assignments', col: 'org_id' },
      { table: 'report_summaries', col: 'org_id' },
    ] as const;

    for (const t of tablesToCheck) {
      const rows = await this.orgRepo.query(
        `SELECT 1 FROM "${t.table}" WHERE "${t.col}" = $1 LIMIT 1`,
        [id],
      );
      if (rows.length > 0) {
        throw new ConflictException(
          'ORG_DELETE_BLOCKED: Đơn vị còn dữ liệu nghiệp vụ liên quan',
        );
      }
    }

    await this.orgRepo.softRemove(org);
    return { ok: true };
  }

  private buildTree(items: Organization[]): OrgTreeNode[] {
    const byId = new Map<string, OrgTreeNode>();
    items.forEach((o) => byId.set(o.id, { ...o, children: [] }));

    const roots: OrgTreeNode[] = [];
    byId.forEach((node) => {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  private async assertOrgExists(id: string) {
    const exists = await this.orgRepo.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException('FK_NOT_FOUND: parent org không tồn tại');
    }
  }

  private async assertNoCycle(orgId: string, newParentId: string) {
    const rows = await this.orgRepo
      .createQueryBuilder('o')
      .select(['o.id', 'o.parentId'])
      .where('o.deleted_at IS NULL')
      .getMany();

    const parentById = new Map<string, string | null>();
    rows.forEach((r) => parentById.set(r.id, r.parentId ?? null));

    let cur: string | null = newParentId;
    while (cur) {
      if (cur === orgId) throw new ConflictException('ORG_CYCLE_DETECTED');
      cur = parentById.get(cur) ?? null;
    }
  }

  private async hasOrganizationClosureTable(): Promise<boolean> {
    if (this.organizationClosureTable !== null) {
      return this.organizationClosureTable;
    }
    try {
      const rows = await this.orgRepo.query(
        `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organization_closure'
        LIMIT 1
      `,
      );
      this.organizationClosureTable = rows.length > 0;
      return this.organizationClosureTable;
    } catch {
      this.organizationClosureTable = false;
      return false;
    }
  }

  private async assertClosureReady() {
    const has = await this.hasOrganizationClosureTable();
    if (!has) {
      throw new BadRequestException(
        'DB_MISSING_TABLE: organization_closure',
      );
    }
  }

  async getAncestors(
    id: string,
    opts?: { includeSelf?: boolean; isActive?: boolean },
  ): Promise<Organization[]> {
    await this.findOne(id);
    await this.assertClosureReady();

    const includeSelf = opts?.includeSelf === true;
    const qb = this.orgRepo
      .createQueryBuilder('o')
      .innerJoin(
        'organization_closure',
        'oc',
        'oc.ancestor_id = o.id AND oc.descendant_id = :id',
        { id },
      );
    await this.selectOrgColumns(qb);

    if (!includeSelf) qb.andWhere('oc.depth > 0');
    if (opts?.isActive !== undefined) {
      qb.andWhere('o.isActive = :active', { active: opts.isActive });
    }

    qb.orderBy('oc.depth', 'DESC');
    return await qb.getMany();
  }

  async getDescendants(
    id: string,
    opts?: { includeSelf?: boolean; isActive?: boolean },
  ): Promise<Organization[]> {
    await this.findOne(id);
    await this.assertClosureReady();

    const includeSelf = opts?.includeSelf === true;
    const qb = this.orgRepo
      .createQueryBuilder('o')
      .innerJoin(
        'organization_closure',
        'oc',
        'oc.descendant_id = o.id AND oc.ancestor_id = :id',
        { id },
      );
    await this.selectOrgColumns(qb);

    if (!includeSelf) qb.andWhere('oc.depth > 0');
    if (opts?.isActive !== undefined) {
      qb.andWhere('o.isActive = :active', { active: opts.isActive });
    }

    qb.orderBy('oc.depth', 'ASC').addOrderBy('o.code', 'ASC');
    return await qb.getMany();
  }
}


