import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReportStatus } from '../../../common';

@Entity('report_status_histories')
export class ReportStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ReportStatus,
    nullable: true,
  })
  fromStatus: ReportStatus | null;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: ReportStatus,
  })
  toStatus: ReportStatus;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
