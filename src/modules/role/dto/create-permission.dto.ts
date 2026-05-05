import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePermissionDto {
  @IsNotEmpty({ message: 'Code là bắt buộc' })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  })
  @IsString()
  @MaxLength(100, { message: 'Code không được vượt quá 100 ký tự' })
  @Matches(/^[a-z0-9_.]+$/, {
    message: 'Code chỉ được chứa chữ, số, dấu chấm và dấu gạch dưới',
  })
  code: string;

  @IsNotEmpty({ message: 'Tên là bắt buộc' })
  @IsString()
  @MaxLength(100, { message: 'Tên không được vượt quá 100 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Category không được vượt quá 50 ký tự' })
  category?: string;
}
