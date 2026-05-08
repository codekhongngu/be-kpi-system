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

  private mapPayload(n: Notification) {
    const payload = (n.payload ?? {}) as Record<string, unknown>;
    return {
      title: (payload.title as string | undefined) ?? null,
      body: (payload.body as string | undefined) ?? null,
      channel: (payload.channel as string | undefined) ?? 'IN_APP',
      isRead: Boolean(payload.isRead),
      refTable: (payload.refTable as string | undefined) ?? null,
      refId:
        payload.refId === undefined || payload.refId === null
          ? null
          : String(payload.refId),
    };
  }

  async listInbox(userId: string, isRead?: boolean, page = 1, limit = 20) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });
    if (isRead !== undefined) {
      qb.andWhere(`COALESCE((n.payload->>'isRead')::boolean, false) = :ir`, {
        ir: isRead,
      });
    }
    qb.orderBy('n.createdAt', 'DESC').skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((n) => {
        const p = this.mapPayload(n);
        return ({
        id: n.id,
        type: n.type,
        title: p.title,
        body: p.body,
        channel: p.channel,
        isRead: p.isRead,
        refTable: p.refTable,
        refId: p.refId,
        status: n.status,
        createdAt: n.createdAt,
        sentAt: n.sentAt,
      });
      }),
      meta: { page, limit: take, total },
    };
  }

  async markRead(id: string, userId: string) {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) return { ok: true as const };
    row.payload = {
      ...(row.payload ?? {}),
      isRead: true,
    };
    await this.repo.save(row);
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
