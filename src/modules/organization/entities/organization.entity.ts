import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Organization, (o) => o.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Organization | null;

  @OneToMany(() => Organization, (o) => o.parent)
  children?: Organization[];

  @Column({ name: 'head_user_id', type: 'uuid', nullable: true })
  headUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'head_user_id' })
  headUser?: User | null;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'can_assign_reports', type: 'boolean', default: true })
  canAssignReports: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
