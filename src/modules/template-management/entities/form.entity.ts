import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FieldCategory } from './field-category.entity';
import { PeriodType } from '../../../common/period-type';

export enum TemplateType {
  AGGREGATE = 'AGGREGATE',
  UNIQUE = 'UNIQUE',
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  IN_USE = 'IN_USE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    name: 'template_type',
    type: 'varchar',
    length: 20,
    default: TemplateType.AGGREGATE,
  })
  templateType: TemplateType;

  @Column({
    name: 'template_status',
    type: 'varchar',
    length: 20,
    default: TemplateStatus.DRAFT,
  })
  templateStatus: TemplateStatus;

  @ManyToOne(() => FieldCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'field_category_id' })
  fieldCategoryRef: FieldCategory | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'period_type', type: 'varchar', length: 10, default: PeriodType.THANG })
  periodType: PeriodType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'template_file',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  templateFile: string | null;

  @Column({ name: 'parent_form_id', type: 'uuid', nullable: true })
  parentFormId: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
