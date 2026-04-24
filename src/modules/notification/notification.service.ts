import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async listInbox(userId: string, isRead?: boolean, page = 1, limit = 20) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const qb = this.repo.createQueryBuilder('n').where('n.userId = :userId', { userId });
    if (isRead !== undefined) qb.andWhere('n.isRead = :ir', { ir: isRead });
    qb.orderBy('n.createdAt', 'DESC').skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        channel: n.channel,
        isRead: n.isRead,
        refTable: n.refTable,
        refId: n.refId,
        status: n.status,
        createdAt: n.createdAt,
        sentAt: n.sentAt,
      })),
      meta: { page, limit: take, total },
    };
  }

  async markRead(id: string, userId: string) {
    await this.repo.update({ id, userId }, { isRead: true });
    return { ok: true as const };
  }

  async listLogs(page = 1, limit = 20) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return {
      items: items.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        status: n.status,
        createdAt: n.createdAt,
      })),
      meta: { page, limit: take, total },
    };
  }
}
