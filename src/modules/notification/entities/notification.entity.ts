import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('app_outbox_events')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 160 })
  type: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 120, default: 'notification' })
  aggregateType: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  title: string | null = null;
  body: string | null = null;
  channel = 'IN_APP';
  isRead = false;
  refTable: string | null = null;
  refId: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
