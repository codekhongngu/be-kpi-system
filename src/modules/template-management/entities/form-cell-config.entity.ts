import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';
import { FormAttribute } from './form-attribute.entity';
import { FormIndicator } from './form-indicator.entity';

@Entity('form_template_cell_configs')
@Unique('UQ_form_cell_configs_form_indicator_attribute', [
  'formId',
  'indicatorId',
  'attributeId',
])
export class FormCellConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId: string;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  form: Form;

  @ManyToOne(() => FormIndicator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'indicator_id' })
  indicator: FormIndicator;

  @ManyToOne(() => FormAttribute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: FormAttribute;

  @Column({ name: 'is_editable', type: 'boolean', default: true })
  isEditable: boolean;

  @Column({ name: 'validation_rule', type: 'jsonb', nullable: true })
  validationRule: Record<string, unknown> | null;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue: string | null;

  @Column({ name: 'data_type', type: 'varchar', length: 20, nullable: true })
  dataType: string | null;

  @Column({ name: 'is_required', type: 'boolean', nullable: true })
  isRequired: boolean | null;

  @Column({ type: 'text', nullable: true })
  formula: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}

