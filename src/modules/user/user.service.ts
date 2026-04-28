import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ImportJob, ImportJobStatus } from '../import-job/entities/import-job.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import type { MeResponse, UserDetail, UserListItem } from './types/user-contract.types';

type ImportErrorRow = { row: number; message: string; field?: string };
type ImportJobSummary = {
  success: number;
  failed: number;
  errors: ImportErrorRow[];
};

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(ImportJob)
    private readonly importJobRepository: Repository<ImportJob>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    _options?: { requireQldlRoleGroups?: boolean },
  ): Promise<{ id: string }> {
    if (!createUserDto.orgId) {
      throw new BadRequestException('orgId là bắt buộc');
    }

    await this.assertUniqueUsernameEmail(
      createUserDto.username,
      createUserDto.email,
    );
    await this.assertFkReferences(createUserDto.orgId);

    const pwdInput = createUserDto.password?.trim();
    let passwordPlain: string;
    if (pwdInput) {
      passwordPlain = pwdInput;
    } else {
      passwordPlain = this.generateStrongPassword();
    }
    this.assertPasswordPolicy(passwordPlain);

    if (createUserDto.code) {
      const dupCode = await this.userRepository.findOne({
        where: { code: createUserDto.code },
        withDeleted: true,
      });
      if (dupCode) throw new ConflictException('Mã nhân sự (code) đã tồn tại');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

    const { roleIds, password: _pw, isActive: _ia, ...rest } =
      createUserDto as any;

    let status: UserStatus = createUserDto.status ?? UserStatus.ACTIVE;
    if (createUserDto.isActive === false) status = UserStatus.INACTIVE;
    if (createUserDto.isActive === true) status = UserStatus.ACTIVE;

    const user = new User();
    Object.assign(user, {
      username: rest.username,
      email: rest.email,
      fullName: rest.fullName ?? null,
      phone: rest.phone ?? null,
      code: rest.code ?? null,
      orgId: rest.orgId ?? null,
      departmentId: rest.departmentId ?? null,
      passwordHash,
      status,
    });

    const saved = await this.userRepository.save(user);

    if (roleIds?.length) {
      await this.assignRoles(saved.id, { roleIds });
    }

    return { id: saved.id };
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
      qb.andWhere('user.status = :activeStatus', { activeStatus: UserStatus.ACTIVE });
    } else if (query.isActive === false) {
      qb.andWhere('user.status != :activeStatus', { activeStatus: UserStatus.ACTIVE });
    }

    if (query.departmentId) {
      qb.andWhere('user.departmentId = :departmentId', {
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
      const direction =
        dirRaw?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
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
    const user = await this.findOne(id);
    return this.toUserDetail(user);
  }

  async getMeResponse(userId: string): Promise<MeResponse> {
    const user = await this.findOne(userId);
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<{ ok: true }> {
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
      const existing = await this.userRepository.findOne({
        where: { code: updateUserDto.code },
        withDeleted: true,
      });
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Mã nhân sự (code) đã tồn tại');
      }
    }

    if (updateUserDto.orgId !== undefined) {
      const nextOrgId = updateUserDto.orgId ?? user.orgId ?? null;
      await this.assertFkReferences(nextOrgId);
    }

    if (updateUserDto.password) {
      this.assertPasswordPolicy(updateUserDto.password);
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
      user.passwordHash = passwordHash;
      delete updateUserDto.password;
    }

    const { roleIds, isActive, ...patch } = updateUserDto as UpdateUserDto & {
      roleIds?: string[];
      isActive?: boolean;
    };

    Object.assign(user, patch);

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
      where: { departmentId },
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

  async createImportJob(
    createdById: string | null,
    fileBuffer: Buffer,
  ): Promise<{ jobId: string }> {
    const job = this.importJobRepository.create({
      type: 'USERS_IMPORT_CSV',
      status: 'QUEUED',
      createdBy: createdById ? ({ id: createdById } as User) : null,
      finishedAt: null,
      summary: { queued: true, bytes: fileBuffer.length },
    });
    const saved = await this.importJobRepository.save(job);
    void this.processImportJob(saved.id, fileBuffer, createdById);
    return { jobId: saved.id };
  }

  async getImportJob(jobId: string) {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy import job');

    const summary = (job.summary ?? {}) as Partial<ImportJobSummary> & {
      status?: ImportJobStatus;
    };

    return {
      jobId: job.id,
      status: job.status,
      success: summary.success ?? 0,
      failed: summary.failed ?? 0,
      errors: summary.errors ?? [],
      finishedAt: job.finishedAt,
    };
  }

  private async processImportJob(
    jobId: string,
    fileBuffer: Buffer,
    actorId: string | null,
  ) {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) return;

    job.status = 'RUNNING';
    job.summary = { ...(job.summary ?? {}), startedAt: new Date().toISOString() };
    await this.importJobRepository.save(job);

    const errors: ImportErrorRow[] = [];
    let success = 0;
    let failed = 0;

    try {
      const text = fileBuffer.toString('utf8');
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        throw new BadRequestException('File CSV không hợp lệ (thiếu header hoặc dữ liệu)');
      }

      const header = this.parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const expected = [
        'code',
        'fullname',
        'email',
        'username',
        'password',
        'orgid',
        'roleids',
        'status',
      ];
      const missing = expected.filter((h) => !header.includes(h));
      if (missing.length) {
        throw new BadRequestException(
          `CSV thiếu cột: ${missing.join(', ')}. Header yêu cầu: ${expected.join(',')}`,
        );
      }

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1; // 1-based including header
        try {
          const cols = this.parseCsvLine(lines[i]);
          if (cols.length !== header.length) {
            throw new Error(`Số cột không khớp header (${cols.length} vs ${header.length})`);
          }
          const row: Record<string, string> = {};
          header.forEach((h, idx) => {
            row[h] = cols[idx]?.trim() ?? '';
          });

          const plainPassword = row.password || this.generateStrongPassword();
          const dto: CreateUserDto = {
            code: row.code || undefined,
            fullName: row.fullname || undefined,
            email: row.email,
            username: row.username,
            password: plainPassword,
            orgId: row.orgid || undefined,
            status: (row.status as UserStatus) || UserStatus.ACTIVE,
            roleIds: row.roleids
              ? row.roleids.split('|').map((s) => s.trim()).filter(Boolean)
              : [],
          };

          this.assertPasswordPolicy(plainPassword);

          const existing = await this.userRepository.findOne({
            where: [{ username: dto.username }, { email: dto.email }],
            withDeleted: true,
          });

          if (existing) {
            if (existing.deletedAt) {
              await this.userRepository.restore({ id: existing.id });
            }
            await this.update(existing.id, {
              fullName: dto.fullName,
              email: dto.email,
              username: dto.username,
              password: dto.password,
              code: dto.code,
              orgId: dto.orgId ?? null,
              status: dto.status,
              roleIds: dto.roleIds,
            });
          } else {
            await this.create(dto);
          }

          success++;
        } catch (e: any) {
          failed++;
          errors.push({
            row: rowNum,
            message: e?.message ? String(e.message) : 'Lỗi không xác định',
          });
        }
      }

      job.status = 'DONE';
      job.finishedAt = new Date();
      job.summary = {
        success,
        failed,
        errors: errors.slice(0, 500),
        truncatedErrors: errors.length > 500,
      };
      await this.importJobRepository.save(job);
    } catch (e: any) {
      job.status = 'FAILED';
      job.finishedAt = new Date();
      job.summary = {
        success,
        failed,
        errors: [
          ...errors,
          { row: 0, message: e?.message ? String(e.message) : 'Import failed' },
        ],
      };
      await this.importJobRepository.save(job);
    }
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

  private normalizeNotifyChannel(raw: string | null | undefined): 'IN_APP' | 'EMAIL' | 'BOTH' {
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

  /**
   * Minimal CSV line parser supporting quoted fields with commas.
   */
  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }
}
