import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
