import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PeriodType, ReportStatus } from '../../../common';
import { Form } from '../../form-designer/entities/form.entity';

@Entity('assignment_batches')
export class AssignmentBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @ManyToOne(() => Form, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_id' })
  formRef: Form;

  @Column({ name: 'template_version', type: 'int', default: 1 })
  templateVersion: number;

  @Column({ name: 'period_type', type: 'varchar', length: 10 })
  periodType: PeriodType;

  @Column({ name: 'period_code', type: 'varchar', length: 30 })
  periodCode: string;

  @Column({ name: 'period_name', type: 'varchar', length: 255, nullable: true })
  periodName: string | null;

  @Column({ name: 'deadline_from', type: 'date' })
  deadlineFrom: string;

  @Column({ name: 'deadline_to', type: 'date' })
  deadlineTo: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.DRAFT,
  })
  status: ReportStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'total_assignments', default: 0 })
  totalAssignments: number;

  @Column({ name: 'assigned_count', default: 0 })
  assignedCount: number;

  @Column({ name: 'in_progress_count', default: 0 })
  inProgressCount: number;

  @Column({ name: 'submitted_count', default: 0 })
  submittedCount: number;

  @Column({ name: 'approved_count', default: 0 })
  approvedCount: number;

  @Column({ name: 'rejected_count', default: 0 })
  rejectedCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}
