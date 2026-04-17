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

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

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

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('role.createdAt', 'DESC');

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
