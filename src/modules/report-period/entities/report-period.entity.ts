import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PeriodType {
  TUAN = 'TUAN',
  THANG = 'THANG',
  QUY = 'QUY',
  NAM = 'NAM',
}

@Entity('report_periods')
export class ReportPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 30 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'period_type', type: 'varchar', length: 10 })
  periodType: PeriodType;

  @Column({ name: 'date_from', type: 'date' })
  dateFrom: string;

  @Column({ name: 'date_to', type: 'date' })
  dateTo: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

