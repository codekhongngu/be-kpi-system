import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRoleDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t.toUpperCase();
  })
  @IsString()
  @MaxLength(50, { message: 'Code không được vượt quá 50 ký tự' })
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'Code chỉ được chứa chữ, số và dấu gạch dưới',
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
