import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { RoleGroup } from '../../modules/user/entities/role-group.entity';
import { UserRoleGroup } from '../../modules/user/entities/user-role-group.entity';

export const QLDL_PERMISSION_KEY = 'qldlPermission';

export type QldlAction = 'READ' | 'WRITE' | 'DELETE' | 'EXPORT';

export type QldlPermissionRequirement = {
  key: string; // e.g. ADMIN_USERS
  action: QldlAction;
};

function mergeRoleGroupPermissions(
  groups: RoleGroup[],
): Record<string, QldlAction[]> {
  const acc = new Map<string, Set<QldlAction>>();
  for (const rg of groups) {
    const raw = rg.permissions as Record<string, QldlAction[]> | null | undefined;
    if (!raw || typeof raw !== 'object') continue;
    for (const [k, actions] of Object.entries(raw)) {
      if (!acc.has(k)) acc.set(k, new Set());
      const set = acc.get(k)!;
      for (const a of actions ?? []) set.add(a);
    }
  }
  const out: Record<string, QldlAction[]> = {};
  for (const [k, set] of acc) out[k] = [...set];
  return out;
}

@Injectable()
export class QldlRbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(RoleGroup)
    private readonly roleGroupRepo: Repository<RoleGroup>,
    @InjectRepository(UserRoleGroup)
    private readonly userRoleGroupRepo: Repository<UserRoleGroup>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: User }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    const required = this.reflector.getAllAndOverride<QldlPermissionRequirement | undefined>(
      QLDL_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const joinRows = await this.userRoleGroupRepo.find({
      where: { userId: user.id },
      select: { roleGroupId: true },
    });
    const ids = new Set<string>();
    for (const r of joinRows) ids.add(r.roleGroupId);
    if (user.roleGroupId) ids.add(user.roleGroupId);

    if (ids.size === 0) {
      throw new ForbiddenException('Thiếu nhóm quyền QLDL (role_group)');
    }

    const groups = await this.roleGroupRepo.find({ where: { id: In([...ids]) } });
    if (groups.length === 0) {
      throw new ForbiddenException('Không tìm thấy nhóm quyền QLDL');
    }

    const perms = mergeRoleGroupPermissions(groups);
    const allowed = perms[required.key] ?? [];
    if (!allowed.includes(required.action)) {
      throw new ForbiddenException(
        `Không đủ quyền QLDL: ${required.key}:${required.action}`,
      );
    }

    return true;
  }
}
