import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AssignmentIndicatorScopeSource {
  TEMPLATE_DEFAULT = 'TEMPLATE_DEFAULT',
  CAMPAIGN_OVERRIDE = 'CAMPAIGN_OVERRIDE',
  MANUAL = 'MANUAL',
}

@Entity('report_campaign_indicator_org_scopes')
export class AssignmentIndicatorScope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  batchId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 30,
    default: AssignmentIndicatorScopeSource.CAMPAIGN_OVERRIDE,
  })
  source: AssignmentIndicatorScopeSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
