import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../role/entities/role.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'code', type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId: string | null;

  // Legacy/API-only field; not persisted in DB v2 users table.
  avatarUrl?: string | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  @Exclude()
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  @Exclude()
  lockedUntil: Date | null;

  // Legacy/API-only field; not persisted in DB v2 users table.
  @Exclude()
  totpSecret?: string | null;

  // Legacy/API-only field; not persisted in DB v2 users table.
  totpEnabled?: boolean;

  // Legacy/API-only field; not persisted in DB v2 users table.
  notifyChannel?: string;

  // Legacy/API-only field; not persisted in DB v2 users table.
  language?: string;

  // Legacy/API-only field; not persisted in DB v2 users table.
  timezone?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  @Exclude()
  deletedAt: Date | null;

  // Many-to-Many relationship with roles
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}


