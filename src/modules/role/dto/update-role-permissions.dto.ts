import { IsArray, IsUUID } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray({ message: 'Permission IDs phải là một mảng' })
  @IsUUID('4', { each: true, message: 'Mỗi permission ID phải là UUID hợp lệ' })
  permissionIds: string[];
}
