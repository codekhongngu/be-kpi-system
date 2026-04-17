import { IsArray, IsUUID } from 'class-validator';

export class AssignRolesDto {
  @IsArray({ message: 'Role IDs phải là một mảng' })
  @IsUUID('4', { each: true, message: 'Mỗi role ID phải là UUID hợp lệ' })
  roleIds: string[];
}
