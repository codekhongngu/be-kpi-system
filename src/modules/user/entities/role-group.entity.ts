import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_groups')
export class RoleGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, string[]> | null;
}
