import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { RoleGroup } from './role-group.entity';

@Entity('user_role_groups')
export class UserRoleGroup {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'role_group_id', type: 'uuid' })
  roleGroupId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => RoleGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_group_id' })
  roleGroup: RoleGroup;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
