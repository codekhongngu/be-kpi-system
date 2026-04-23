import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchRoleGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;
}
