import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PeriodType } from '../../../common';

@Entity('assignment_batches')
export class AssignmentBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

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

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
