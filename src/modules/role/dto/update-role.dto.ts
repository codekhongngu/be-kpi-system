import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Code không được vượt quá 50 ký tự' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Code chỉ được chứa chữ thường, số và dấu gạch dưới',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên không được vượt quá 100 ký tự' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
