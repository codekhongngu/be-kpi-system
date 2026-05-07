import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AssignmentIndicatorScopeSource {
  TEMPLATE_DEFAULT = 'TEMPLATE_DEFAULT',
  CAMPAIGN_OVERRIDE = 'CAMPAIGN_OVERRIDE',
  MANUAL = 'MANUAL',
}

@Entity('assignment_indicator_scopes')
export class AssignmentIndicatorScope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 30,
    default: AssignmentIndicatorScopeSource.MANUAL,
  })
  source: AssignmentIndicatorScopeSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
