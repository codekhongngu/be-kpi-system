import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleGroup } from '../user/entities/role-group.entity';
import { User } from '../user/entities/user.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { QldlAction } from '../../common/guards/qldl-rbac.guard';
import { CreateRoleGroupDto } from './role-groups/dto/create-role-group.dto';
import { PatchRoleGroupDto } from './role-groups/dto/patch-role-group.dto';
import { RBAC_PERMISSION_DEFS } from './permissions/rbac-permission-defs';

const ALLOWED_ACTIONS: QldlAction[] = ['READ', 'WRITE', 'DELETE', 'EXPORT'];

export type RoleGroupListItem = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Record<string, QldlAction[]>;
};

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(RoleGroup)
    private readonly roleGroupRepo: Repository<RoleGroup>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRoleGroup)
    private readonly userRoleGroupRepo: Repository<UserRoleGroup>,
  ) {}

  private normalizePermissions(
    raw: Record<string, string[]> | null | undefined,
  ): Record<string, QldlAction[]> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, QldlAction[]> = {};
    for (const [k, actions] of Object.entries(raw)) {
      if (!Array.isArray(actions)) {
        throw new BadRequestException(
          `permissions.${k} phải là mảng hành động (READ|WRITE|DELETE|EXPORT)`,
        );
      }
      const normalized: QldlAction[] = [];
      for (const a of actions) {
        if (!ALLOWED_ACTIONS.includes(a as QldlAction)) {
          throw new BadRequestException(
            `permissions.${k}: hành động không hợp lệ "${a}"`,
          );
        }
        if (!normalized.includes(a as QldlAction)) {
          normalized.push(a as QldlAction);
        }
      }
      out[k] = normalized;
    }
    return out;
  }

  private assertKnownPermissionKeys(perms: Record<string, QldlAction[]>) {
    const allowed = new Set(RBAC_PERMISSION_DEFS.map((d) => d.key));
    for (const key of Object.keys(perms)) {
      if (!allowed.has(key)) {
        throw new BadRequestException(
          `permissions: key không thuộc catalog — "${key}"`,
        );
      }
    }
  }

  private toListItem(rg: RoleGroup): RoleGroupListItem {
    return {
      id: rg.id,
      name: rg.name,
      description: rg.description ?? null,
      isSystem: rg.isSystem,
      permissions: this.normalizePermissions(rg.permissions ?? undefined),
    };
  }

  async listRoleGroups(): Promise<{ items: RoleGroupListItem[] }> {
    const rows = await this.roleGroupRepo.find({ order: { name: 'ASC' } });
    return { items: rows.map((r) => this.toListItem(r)) };
  }

  async createRoleGroup(
    dto: CreateRoleGroupDto,
  ): Promise<{ id: string }> {
    const permissions = this.normalizePermissions(dto.permissions);
    this.assertKnownPermissionKeys(permissions);
    const created = this.roleGroupRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      permissions: permissions as unknown as Record<string, string[]>,
      isSystem: false,
    });
    const saved = await this.roleGroupRepo.save(created);
    return { id: saved.id };
  }

  async patchRoleGroup(
    id: string,
    dto: PatchRoleGroupDto,
  ): Promise<{ ok: true }> {
    const rg = await this.roleGroupRepo.findOne({ where: { id } });
    if (!rg) throw new NotFoundException('Không tìm thấy nhóm quyền');
    if (dto.name !== undefined) rg.name = dto.name.trim();
    if (dto.description !== undefined) {
      rg.description =
        dto.description === null || dto.description === ''
          ? null
          : dto.description.trim();
    }
    if (dto.permissions !== undefined) {
      const permissions = this.normalizePermissions(dto.permissions);
      this.assertKnownPermissionKeys(permissions);
      rg.permissions = permissions as unknown as Record<string, string[]>;
    }
    await this.roleGroupRepo.save(rg);
    return { ok: true };
  }

  async deleteRoleGroup(id: string): Promise<{ ok: true }> {
    const rg = await this.roleGroupRepo.findOne({ where: { id } });
    if (!rg) throw new NotFoundException('Không tìm thấy nhóm quyền');
    if (rg.isSystem) {
      throw new ConflictException('ROLE_GROUP_SYSTEM_PROTECTED');
    }
    const usersCount = await this.userRepo.count({ where: { roleGroupId: id } });
    const joinCount = await this.userRoleGroupRepo.count({
      where: { roleGroupId: id },
    });
    if (usersCount > 0 || joinCount > 0) {
      throw new ConflictException('ROLE_GROUP_IN_USE');
    }
    await this.roleGroupRepo.remove(rg);
    return { ok: true };
  }
}
