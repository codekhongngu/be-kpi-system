import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Organization } from '../organization/entities/organization.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import type {
  MeResponse,
  UserDetail,
  UserListItem,
} from './types/user-contract.types';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    _options?: { requireQldlRoleGroups?: boolean },
  ): Promise<{ id: string; username: string; password: string }> {
    if (!createUserDto.orgId) {
      throw new BadRequestException('orgId là bắt buộc');
    }

    await this.assertUniqueUsernameEmail(
      createUserDto.username,
      createUserDto.email,
    );
    await this.assertFkReferences(createUserDto.orgId);

    const passwordPlain = createUserDto.password.trim();
    this.assertPasswordPolicy(passwordPlain);

    if (createUserDto.code) {
      const code = createUserDto.code.trim();
      const dupCode = await this.userRepository.findOne({
        where: { code: ILike(code) },
        withDeleted: true,
      });
      if (dupCode) throw new ConflictException('Mã nhân sự (code) đã tồn tại');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

    const {
      roleIds,
      password: _pw,
      isActive: _ia,
      ...rest
    } = createUserDto as any;

    let status: UserStatus = createUserDto.status ?? UserStatus.ACTIVE;
    if (createUserDto.isActive === false) status = UserStatus.INACTIVE;
    if (createUserDto.isActive === true) status = UserStatus.ACTIVE;

    const user = new User();
    const normalizedOrgId = rest.orgId ?? rest.departmentId ?? null;
    Object.assign(user, {
      username: rest.username,
      email: rest.email,
      fullName: rest.fullName ?? null,
      phone: rest.phone ?? null,
      code: rest.code,
      orgId: normalizedOrgId,
      passwordHash,
      status,
    });

    const saved = await this.userRepository.save(user);

    if (roleIds?.length) {
      await this.assignRoles(saved.id, { roleIds });
    }

    return { 
      id: saved.id,
      username: saved.username,
      password: passwordPlain
    };
  }

  async findAll(query: UserQueryDto): Promise<{
    items: UserListItem[];
    meta: { total: number; page: number; limit: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles');

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.isActive === true) {
      qb.andWhere('user.status = :activeStatus', {
        activeStatus: UserStatus.ACTIVE,
      });
    } else if (query.isActive === false) {
      qb.andWhere('user.status != :activeStatus', {
        activeStatus: UserStatus.ACTIVE,
      });
    }

    if (query.departmentId) {
      qb.andWhere('user.orgId = :departmentId', {
        departmentId: query.departmentId,
      });
    }

    if (query.orgId) {
      qb.andWhere('user.orgId = :orgId', { orgId: query.orgId });
    }

    if (query.roleId) {
      qb.andWhere('roles.id = :roleId', { roleId: query.roleId });
    }

    const kw = query.search ?? query.q;
    if (kw) {
      qb.andWhere(
        '(user.username ILIKE :kw OR user.email ILIKE :kw OR user.fullName ILIKE :kw OR user.code ILIKE :kw)',
        { kw: `%${kw}%` },
      );
    }

    const sortRaw = query.sort?.trim();
    if (sortRaw) {
      const [field, dirRaw] = sortRaw.split(',').map((s) => s.trim());
      const col =
        field === 'createdAt'
          ? 'user.createdAt'
          : field === 'username'
            ? 'user.username'
            : 'user.createdAt';
      const direction = dirRaw?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(col, direction);
    } else {
      qb.orderBy('user.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const items = await this.toUserListItems(data);

    return {
      items,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string, loadRelations = false): Promise<User> {
    let user: User | null;

    if (loadRelations) {
      user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id })
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('roles.permissions', 'permissions')
        .getOne();
    } else {
      user = await this.userRepository.findOne({ where: { id } });
    }

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (!user.roles) {
      user.roles = [];
    }

    return user;
  }

  async findOneDetail(id: string): Promise<UserDetail> {
    const user = await this.findOne(id, true);
    return this.toUserDetail(user);
  }

  async getMeResponse(userId: string): Promise<MeResponse> {
    const user = await this.findOne(userId, true);

    // Trích xuất danh sách mã vai trò (role codes)
    const roles = user.roles?.map((r) => r.code) ?? [];

    // Trích xuất danh sách mã quyền hạn (permission codes) duy nhất
    const permissions = new Set<string>();
    user.roles?.forEach((role) => {
      role.permissions?.forEach((perm) => permissions.add(perm.code));
    });

    return {
      id: user.id,
      code: user.code ?? '',
      fullName: user.fullName ?? '',
      email: user.email,
      username: user.username,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      orgId: user.orgId,
      roleIds: user.roles?.map((r) => r.id) ?? [],
      roles: roles,
      permissions: Array.from(permissions),
      language: user.language ?? 'vi',
      timezone: user.timezone ?? 'Asia/Ho_Chi_Minh',
      notifyChannel: this.normalizeNotifyChannel(user.notifyChannel),
    };
  }

  async findByUsernameOrEmail(
    usernameOrEmail: string,
    loadRelations = false,
  ): Promise<User | null> {
    if (loadRelations) {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.username = :usernameOrEmail', { usernameOrEmail })
        .orWhere('user.email = :usernameOrEmail', { usernameOrEmail })
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('roles.permissions', 'permissions')
        .getOne();
    }
    return await this.userRepository.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<{ ok: true }> {
    const user = await this.findOne(id);

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
        withDeleted: true,
      });
      if (existing) {
        throw new ConflictException('Username đã tồn tại');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
        withDeleted: true,
      });
      if (existing) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    if (updateUserDto.code && updateUserDto.code !== (user.code ?? '')) {
      const code = updateUserDto.code.trim();
      const existing = await this.userRepository.findOne({
        where: { code: ILike(code) },
        withDeleted: true,
      });
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Mã nhân sự (code) đã tồn tại');
      }
    }

    if (updateUserDto.orgId !== undefined) {
      const nextOrgId = updateUserDto.orgId ?? user.orgId ?? null;
      await this.assertFkReferences(nextOrgId);
    } else if (updateUserDto.departmentId !== undefined) {
      await this.assertFkReferences(updateUserDto.departmentId ?? null);
    }

    if (updateUserDto.password) {
      this.assertPasswordPolicy(updateUserDto.password);
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
      user.passwordHash = passwordHash;
      delete updateUserDto.password;
    }

    const { roleIds, isActive, ...patch } = updateUserDto as UpdateUserDto & {
      roleIds?: string[];
      isActive?: boolean;
    };
    const normalizedPatch = { ...patch } as any;
    if (normalizedPatch.departmentId !== undefined) {
      normalizedPatch.orgId = normalizedPatch.departmentId;
      delete normalizedPatch.departmentId;
    }
    Object.assign(user, normalizedPatch);

    if (isActive === true) {
      user.status = UserStatus.ACTIVE;
    } else if (isActive === false) {
      user.status = UserStatus.INACTIVE;
    }

    const saved = await this.userRepository.save(user);

    if (roleIds) {
      await this.assignRoles(saved.id, { roleIds });
    }

    return { ok: true };
  }

  async remove(id: string): Promise<{ ok: true }> {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
    return { ok: true };
  }

  async updateStatus(id: string, status: UserStatus): Promise<{ ok: true }> {
    const user = await this.findOne(id);
    user.status = status;
    await this.userRepository.save(user);
    return { ok: true };
  }

  async activate(id: string): Promise<{ ok: true }> {
    const user = await this.findOne(id);
    user.status = UserStatus.ACTIVE;
    user.lockedUntil = null;
    user.failedLoginAttempts = 0;
    await this.userRepository.save(user);
    return { ok: true };
  }

  async deactivate(id: string): Promise<{ ok: true }> {
    const user = await this.findOne(id);
    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);
    return { ok: true };
  }

  async resetPassword(
    id: string,
    newPassword?: string,
  ): Promise<{ ok: true; temporaryPassword?: string }> {
    const user = await this.findOne(id);
    const pwd =
      newPassword && newPassword.length > 0
        ? newPassword
        : this.generateStrongPassword();
    this.assertPasswordPolicy(pwd);
    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(pwd, saltRounds);
    await this.userRepository.save(user);

    if (!newPassword || newPassword.length === 0) {
      return { ok: true, temporaryPassword: pwd };
    }
    return { ok: true };
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLogin: new Date() });
  }

  async incrementFailedLoginAttempt(id: string): Promise<number> {
    await this.userRepository.increment({ id }, 'failedLoginAttempts', 1);
    const u = await this.userRepository.findOne({
      where: { id },
      select: { id: true, failedLoginAttempts: true },
    });
    return u?.failedLoginAttempts ?? 0;
  }

  async resetFailedLoginAttemptsAndUnlock(id: string): Promise<void> {
    await this.userRepository.update(id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async lockUntil(id: string, lockedUntil: Date): Promise<void> {
    await this.userRepository.update(id, {
      lockedUntil,
    });
  }

  async findByDepartment(departmentId: string): Promise<UserListItem[]> {
    const users = await this.userRepository.find({
      where: { orgId: departmentId },
    });
    return this.toUserListItems(users);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.findOne(userId, true);
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    const permissions = new Set<string>();
    user.roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          permissions.add(permission.code);
        });
      }
    });

    return Array.from(permissions);
  }

  async assignRoles(
    userId: string,
    assignRolesDto: AssignRolesDto,
  ): Promise<{ ok: true }> {
    const user = await this.findOne(userId);

    const roles = await this.roleRepository.find({
      where: { id: In(assignRolesDto.roleIds) },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      throw new NotFoundException('Một hoặc nhiều role không tồn tại');
    }

    user.roles = roles;
    await this.userRepository.save(user);
    return { ok: true };
  }

  private toUserListItem(user: User, map: Map<string, string[]>): UserListItem {
    const last = user.lastLogin;
    return {
      id: user.id,
      code: user.code ?? '',
      fullName: user.fullName ?? '',
      email: user.email,
      username: user.username,
      orgId: user.orgId,
      roleIds: user.roles?.map((r) => r.id) ?? [],
      isActive: user.status === UserStatus.ACTIVE,
      lastLoginAt: last ? new Date(last).toISOString() : null,
    };
  }

  private normalizeNotifyChannel(
    raw: string | null | undefined,
  ): 'IN_APP' | 'EMAIL' | 'BOTH' {
    const v = (raw ?? 'BOTH').toUpperCase().replace(/-/g, '_');
    if (v === 'EMAIL') return 'EMAIL';
    if (v === 'IN_APP' || v === 'INAPP') return 'IN_APP';
    return 'BOTH';
  }

  private toUserDetail(user: User): UserDetail {
    const base = this.toUserListItem(user, new Map());
    return {
      ...base,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      language: user.language ?? 'vi',
      timezone: user.timezone ?? 'Asia/Ho_Chi_Minh',
      notifyChannel: this.normalizeNotifyChannel(user.notifyChannel),
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
      deletedAt: user.deletedAt ? new Date(user.deletedAt).toISOString() : null,
    };
  }

  private async toUserListItems(users: User[]): Promise<UserListItem[]> {
    return users.map((u) => this.toUserListItem(u, new Map()));
  }

  private async assertUniqueUsernameEmail(username: string, email: string) {
    const existingUsername = await this.userRepository.findOne({
      where: { username },
      withDeleted: true,
    });
    if (existingUsername) {
      throw new ConflictException('Username đã tồn tại');
    }

    const existingEmail = await this.userRepository.findOne({
      where: { email },
      withDeleted: true,
    });
    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại');
    }
  }

  private async assertFkReferences(orgId?: string | null) {
    if (orgId) {
      const org = await this.orgRepository.findOne({ where: { id: orgId } });
      if (!org) throw new NotFoundException('FK_NOT_FOUND: org không tồn tại');
    }
  }

  private assertPasswordPolicy(password: string) {
    const minLen = this.configService.get<number>('AUTH_PASSWORD_MIN_LEN', 8);
    if (password.length < minLen) {
      throw new BadRequestException(`Mật khẩu phải có ít nhất ${minLen} ký tự`);
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!(hasUpper && hasLower && hasNumber && hasSymbol)) {
      throw new BadRequestException(
        'Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
      );
    }
  }

  private generateStrongPassword() {
    // 16 chars, meets policy with high probability; retry a few times if not
    for (let i = 0; i < 10; i++) {
      const raw = randomBytes(12).toString('base64url');
      const pwd = `Aa1!${raw}`;
      try {
        this.assertPasswordPolicy(pwd);
        return pwd;
      } catch {
        // retry
      }
    }
    return `Aa1!${randomBytes(16).toString('base64url')}`;
  }
}
