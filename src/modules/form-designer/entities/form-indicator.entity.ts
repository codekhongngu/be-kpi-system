import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Form } from './form.entity';

@Entity('form_indicators')
export class FormIndicator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @ManyToOne(() => FormIndicator, (indicator) => indicator.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: FormIndicator | null;

  @OneToMany(() => FormIndicator, (indicator) => indicator.parent)
  children: FormIndicator[];

  @Column({
    name: 'display_index',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  displayIndex: string | null;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unit: string | null;

  @Column({ name: 'data_type', type: 'varchar', length: 20 })
  dataType: string;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired: boolean;

  @Column({ name: 'is_readonly', type: 'boolean', default: false })
  isReadonly: boolean;

  @Column({ name: 'is_calculated', type: 'boolean', default: false })
  isCalculated: boolean;

  @Column({ type: 'text', nullable: true })
  formula: string | null;

  @Column({ name: 'group_name', type: 'varchar', length: 255, nullable: true })
  groupName: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'min_value', type: 'numeric', nullable: true })
  minValue: string | null;

  @Column({ name: 'max_value', type: 'numeric', nullable: true })
  maxValue: string | null;

  @Column({ name: 'validation_rule', type: 'jsonb', nullable: true })
  validationRule: Record<string, unknown> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'catalog_indicator_id', type: 'uuid', nullable: true })
  catalogIndicatorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
