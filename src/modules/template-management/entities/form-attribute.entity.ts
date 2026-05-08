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

@Entity('form_template_attributes')
export class FormAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  form: Form;

  @ManyToOne(() => FormAttribute, (attribute) => attribute.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: FormAttribute | null;

  @OneToMany(() => FormAttribute, (attribute) => attribute.parent)
  children: FormAttribute[];

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'data_type', type: 'varchar', length: 20, nullable: true })
  dataType: string | null;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ name: 'is_readonly', type: 'boolean', default: false })
  isReadonly: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  options: Record<string, unknown> | null = null;
  validationRule: Record<string, unknown> | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
