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

@Entity('form_template_indicators')
export class FormIndicator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
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

  @Column({ type: 'varchar', length: 10, default: 'INPUT' })
  type: 'INPUT' | 'TITLE';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'catalog_indicator_id', type: 'uuid', nullable: true })
  catalogIndicatorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
