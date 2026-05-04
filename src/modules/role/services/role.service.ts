import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleQueryDto } from '../dto/role-query.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';

type RbacAction = 'READ' | 'WRITE' | 'DELETE' | 'EXPORT';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  private permissionToKeyAction(code: string): { key: string; action: RbacAction } {
    const [keyRaw, actionRaw] = String(code).split('.', 2);
    const key = keyRaw || String(code);
    switch (actionRaw) {
      case 'read':
        return { key, action: 'READ' };
      case 'export':
        return { key, action: 'EXPORT' };
      case 'delete':
        return { key, action: 'DELETE' };
      case 'manage':
      case 'create':
      case 'update':
      case 'assign':
      case 'write':
        return { key, action: 'WRITE' };
      default:
        return { key, action: 'WRITE' };
    }
  }

  private buildRoleGroupPermissions(
    permissions: Permission[],
  ): Record<string, RbacAction[]> {
    const map = new Map<string, Set<RbacAction>>();
    for (const p of permissions ?? []) {
      const { key, action } = this.permissionToKeyAction(p.code);
      const s = map.get(key) ?? new Set<RbacAction>();
      s.add(action);
      map.set(key, s);
    }
    const out: Record<string, RbacAction[]> = {};
    for (const [k, v] of map.entries()) {
      out[k] = Array.from(v);
    }
    return out;
  }

  private async resolvePermissionsFromRoleGroupPayload(
    permissions?: Record<string, RbacAction[]>,
  ): Promise<Permission[]> {
    if (!permissions) return [];
    const all = await this.permissionRepository.find();
    const wanted = new Set<string>();
    for (const [key, actions] of Object.entries(permissions)) {
      for (const a of actions ?? []) {
        wanted.add(`${key}::${a}`);
      }
    }
    return all.filter((p) => {
      const { key, action } = this.permissionToKeyAction(p.code);
      return wanted.has(`${key}::${action}`);
    });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Check if code already exists
    const existing = await this.roleRepository.findOne({
      where: { code: createRoleDto.code },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException('Role code đã tồn tại');
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      isSystem: false,
    });

    return await this.roleRepository.save(role);
  }

  async listRoleGroups() {
    const roles = await this.roleRepository.find({ relations: ['permissions'] });
    return {
      items: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        isSystem: r.isSystem,
        permissions: this.buildRoleGroupPermissions(r.permissions ?? []),
      })),
    };
  }

  async createRoleGroup(dto: {
    name: string;
    description?: string;
    permissions: Record<string, RbacAction[]>;
  }) {
    const code = `rg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const permissions = await this.resolvePermissionsFromRoleGroupPayload(
      dto.permissions,
    );

    const role = this.roleRepository.create({
      code,
      name: dto.name,
      description: dto.description ?? null,
      isSystem: false,
      permissions,
    });
    const saved = await this.roleRepository.save(role);
    return { id: saved.id };
  }

  async patchRoleGroup(
    id: string,
    dto: Partial<{
      name: string;
      description: string | null;
      permissions: Record<string, RbacAction[]>;
    }>,
  ) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('Không thể cập nhật system role');
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions !== undefined) {
      role.permissions = await this.resolvePermissionsFromRoleGroupPayload(
        dto.permissions,
      );
    }
    await this.roleRepository.save(role);
    return { ok: true };
  }

  async removeRoleGroup(id: string) {
    await this.remove(id);
    return { ok: true };
  }

  async findAll(query: RoleQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    if (search) {
      queryBuilder.andWhere(
        '(role.code ILIKE :search OR role.name ILIKE :search OR role.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.skip(skip).take(limit).orderBy('role.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }
    return role;
  }

  async findByCode(code: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { code },
      relations: ['permissions'],
    });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // Check if role is system role
    if (role.isSystem) {
      throw new BadRequestException('Không thể cập nhật system role');
    }

    // Check if code is being updated and already exists
    if (updateRoleDto.code && updateRoleDto.code !== role.code) {
      const existing = await this.roleRepository.findOne({
        where: { code: updateRoleDto.code },
      });
      if (existing) {
        throw new ConflictException('Role code đã tồn tại');
      }
    }

    Object.assign(role, updateRoleDto);

    return await this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    // Check if role is system role
    if (role.isSystem) {
      throw new BadRequestException('Không thể xóa system role');
    }

    await this.roleRepository.softRemove(role);
  }

  async getPermissions(id: string): Promise<Permission[]> {
    const role = await this.findOne(id);
    return role.permissions || [];
  }

  async updatePermissions(
    id: string,
    updateRolePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<Role> {
    const role = await this.findOne(id);

    // Validate all permission IDs exist
    const permissions = await this.permissionRepository.find({
      where: { id: In(updateRolePermissionsDto.permissionIds) },
    });

    if (permissions.length !== updateRolePermissionsDto.permissionIds.length) {
      throw new NotFoundException('Một hoặc nhiều permission không tồn tại');
    }

    role.permissions = permissions;
    return await this.roleRepository.save(role);
  }
}
