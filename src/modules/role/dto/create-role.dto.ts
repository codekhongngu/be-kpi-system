import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRoleDto {
  @IsNotEmpty({ message: 'Code là bắt buộc' })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    return value.trim().toUpperCase();
  })
  @IsString()
  @MaxLength(50, { message: 'Code không được vượt quá 50 ký tự' })
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'Code chỉ được chứa chữ, số và dấu gạch dưới',
  })
  code: string;

  @IsNotEmpty({ message: 'Tên là bắt buộc' })
  @IsString()
  @MaxLength(100, { message: 'Tên không được vượt quá 100 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
