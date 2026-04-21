import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username already exists
    const existingUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
      withDeleted: true,
    });
    if (existingUsername) {
      throw new ConflictException('Username đã tồn tại');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
      withDeleted: true,
    });
    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

    const user = this.userRepository.create({
      ...createUserDto,
      passwordHash,
    });

    return await this.userRepository.save(user);
  }

  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 10, search, status, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (departmentId) {
      queryBuilder.andWhere('user.departmentId = :departmentId', {
        departmentId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.skip(skip).take(limit).orderBy('user.createdAt', 'DESC');

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
    
    // Ensure roles is always an array
    if (!user.roles) {
      user.roles = [];
    }
    
    return user;
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if username is being updated and already exists
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existing) {
        throw new ConflictException('Username đã tồn tại');
      }
    }

    // Check if email is being updated and already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existing) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    // Hash password if provided
    if (updateUserDto.password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
      user.passwordHash = passwordHash;
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);

    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findOne(id);
    user.status = status;
    return await this.userRepository.save(user);
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

  async findByDepartment(departmentId: string): Promise<User[]> {
    return await this.userRepository.find({
      where: { departmentId },
    });
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

  async assignRoles(userId: string, assignRolesDto: AssignRolesDto): Promise<User> {
    const user = await this.findOne(userId);

    // Validate all role IDs exist
    const roles = await this.roleRepository.find({
      where: { id: In(assignRolesDto.roleIds) },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      throw new NotFoundException('Một hoặc nhiều role không tồn tại');
    }

    user.roles = roles;
    return await this.userRepository.save(user);
  }
}
