import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { PermissionQueryDto } from '../dto/permission-query.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Check if code already exists
    const existing = await this.permissionRepository.findOne({
      where: { code: createPermissionDto.code },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException('Permission code đã tồn tại');
    }

    const permission = this.permissionRepository.create(createPermissionDto);

    return await this.permissionRepository.save(permission);
  }

  async findAll(query: PermissionQueryDto) {
    const { page = 1, limit = 10, search, category } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.permissionRepository.createQueryBuilder(
      'permission',
    );

    if (search) {
      queryBuilder.andWhere(
        '(permission.code ILIKE :search OR permission.name ILIKE :search OR permission.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('permission.category = :category', { category });
    }

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('permission.category', 'ASC')
      .addOrderBy('permission.name', 'ASC');

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

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!permission) {
      throw new NotFoundException('Không tìm thấy permission');
    }
    return permission;
  }

  async findByCode(code: string): Promise<Permission | null> {
    return await this.permissionRepository.findOne({
      where: { code },
    });
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOne(id);

    // Check if code is being updated and already exists
    if (updatePermissionDto.code && updatePermissionDto.code !== permission.code) {
      const existing = await this.permissionRepository.findOne({
        where: { code: updatePermissionDto.code },
      });
      if (existing) {
        throw new ConflictException('Permission code đã tồn tại');
      }
    }

    Object.assign(permission, updatePermissionDto);

    return await this.permissionRepository.save(permission);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findOne(id);
    await this.permissionRepository.softRemove(permission);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.permissionRepository
      .createQueryBuilder('permission')
      .select('DISTINCT permission.category', 'category')
      .where('permission.category IS NOT NULL')
      .getRawMany();

    return result.map((item) => item.category).filter(Boolean);
  }
}
