import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('report_submissions')
export class ReportSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 25, unique: true })
  code: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ length: 20, default: 'DRAFT' })
  status: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({
    name: 'completion_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  completionPct: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}
