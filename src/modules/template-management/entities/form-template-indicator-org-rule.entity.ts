import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('form_template_indicator_org_rules')
@Unique('UQ_form_template_indicator_org_rules', ['templateId', 'orgId', 'indicatorId'])
export class FormTemplateIndicatorOrgRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}

