import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReportAssignmentStatus } from '../../../common';

@Entity('assignment_status_histories')
export class AssignmentStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ReportAssignmentStatus,
    nullable: true,
  })
  fromStatus: ReportAssignmentStatus | null;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: ReportAssignmentStatus,
  })
  toStatus: ReportAssignmentStatus;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
