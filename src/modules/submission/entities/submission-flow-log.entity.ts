import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SubmissionFlowEvent {
  SUBMIT = 'SUBMIT',
  FORWARD = 'FORWARD',
  REJECT = 'REJECT',
  APPROVE = 'APPROVE',
}

@Entity('submission_flow_logs')
export class SubmissionFlowLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId: string;

  @Column({
    type: 'enum',
    enum: SubmissionFlowEvent,
  })
  event: SubmissionFlowEvent;

  @Column({ name: 'from_status', type: 'varchar', length: 50, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 50 })
  toStatus: string;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: any | null;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
