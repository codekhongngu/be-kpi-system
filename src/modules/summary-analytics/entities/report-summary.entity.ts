import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PeriodType } from '../../../common';

@Entity('report_summaries')
export class ReportSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'period_type', type: 'varchar', length: 10 })
  periodType: PeriodType;

  @Column({ name: 'period_from', type: 'date' })
  periodFrom: string;

  @Column({ name: 'period_to', type: 'date' })
  periodTo: string;

  @Column({ name: 'period_code', type: 'varchar', length: 30, nullable: true })
  periodCode: string | null;

  @Column({
    name: 'period_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  periodName: string | null;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ length: 20, default: 'DRAFT' })
  status: string;

  @Column({ name: 'total_units', type: 'int', nullable: true })
  totalUnits: number | null;

  @Column({ name: 'submitted_units', type: 'int', nullable: true })
  submittedUnits: number | null;

  @Column({ name: 'approved_units', type: 'int', nullable: true })
  approvedUnits: number | null;

  @Column({ name: 'summary_data', type: 'jsonb', nullable: true })
  summaryData: Record<string, unknown> | null;

  @Column({ name: 'summarized_by', type: 'uuid', nullable: true })
  summarizedBy: string | null;

  @Column({ name: 'summarized_at', type: 'timestamptz', nullable: true })
  summarizedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}


