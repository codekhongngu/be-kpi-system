import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** `Record<permissionKey, QldlAction[]>` — validate chi tiết ở service */
  @IsObject()
  permissions: Record<string, string[]>;
}
