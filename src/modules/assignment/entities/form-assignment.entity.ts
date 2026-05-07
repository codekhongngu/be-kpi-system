import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PeriodType, ReportAssignmentStatus } from '../../../common';
import { AssignmentBatch } from './assignment-batch.entity';

@Entity('form_assignments')
export class FormAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string | null;

  @ManyToOne(() => AssignmentBatch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'batch_id' })
  batchRef: AssignmentBatch | null;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'assignee_user_id', type: 'uuid', nullable: true })
  assigneeUserId: string | null;

  @Column({ name: 'period_type', type: 'varchar', length: 10 })
  periodType: PeriodType;

  @Column({ name: 'period_code', type: 'varchar', length: 30 })
  periodCode: string;

  @Column({
    name: 'period_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  periodName: string | null;

  @Column({ name: 'deadline_from', type: 'date' })
  deadlineFrom: string;

  @Column({ name: 'deadline_to', type: 'date' })
  deadlineTo: string;

  @Column({
    type: 'enum',
    enum: ReportAssignmentStatus,
    default: ReportAssignmentStatus.ASSIGNED,
  })
  status: ReportAssignmentStatus;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ name: 'is_cancelled', default: false })
  isCancelled: boolean;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'auto_assign', default: false })
  autoAssign: boolean;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string | null;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}
