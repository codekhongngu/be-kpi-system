import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';
import { User } from '../user/entities/user.entity';

type OrgTreeNode = Organization & { children: OrgTreeNode[] };

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const exists = await this.orgRepo.findOne({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Mã đơn vị đã tồn tại');

    if (dto.parentId) {
      await this.assertOrgExists(dto.parentId);
    }
    if (dto.headUserId) {
      await this.assertUserExists(dto.headUserId);
    }

    const org = this.orgRepo.create({
      code: dto.code,
      name: dto.name,
      parentId: dto.parentId ?? null,
      headUserId: dto.headUserId ?? null,
      level: dto.level ?? 1,
      isActive: true,
      description: dto.description ?? null,
    });
    return await this.orgRepo.save(org);
  }

  async findAll(query: OrganizationQueryDto) {
    const qb = this.orgRepo.createQueryBuilder('o');

    if (query.isActive !== undefined) {
      qb.andWhere('o.isActive = :isActive', { isActive: query.isActive });
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
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Không tìm thấy đơn vị');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findOne(id);

    if (dto.code && dto.code !== org.code) {
      const exists = await this.orgRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Mã đơn vị đã tồn tại');
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

    if (dto.headUserId !== undefined) {
      if (dto.headUserId) await this.assertUserExists(dto.headUserId);
    }

    Object.assign(org, {
      ...dto,
      parentId: dto.parentId !== undefined ? dto.parentId : org.parentId,
      headUserId:
        dto.headUserId !== undefined ? dto.headUserId : org.headUserId,
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

    const userCount = await this.userRepo.count({ where: { orgId: id } });
    if (userCount > 0) {
      throw new ConflictException(
        'ORG_DELETE_BLOCKED: Đơn vị còn người dùng liên quan',
      );
    }

    const tablesToCheck = [
      { table: 'form_assignments', col: 'org_id' },
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

  private async assertUserExists(id: string) {
    const exists = await this.userRepo.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException('FK_NOT_FOUND: head user không tồn tại');
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
}
