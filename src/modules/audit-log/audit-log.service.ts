import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    options?: {
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      description?: string;
      ipAddress?: string;
    },
  ) {
    const entry = this.repo.create({
      userId,
      action,
      entityType,
      entityId,
      oldValues: options?.oldValues ?? null,
      newValues: options?.newValues ?? null,
      description: options?.description ?? null,
      ipAddress: options?.ipAddress ?? null,
    });
    return await this.repo.save(entry);
  }

  async findAll(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('log');

    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });
    }
    if (query.from) {
      qb.andWhere('log.createdAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('log.createdAt <= :to', { to: query.to });
    }
    if (query.q?.trim()) {
      qb.andWhere(
        '(log.description ILIKE :q OR log.entityType ILIKE :q)',
        { q: `%${query.q.trim()}%` },
      );
    }

    qb.orderBy('log.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async findByEntity(entityType: string, entityId: string) {
    return await this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
