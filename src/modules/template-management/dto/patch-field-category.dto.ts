import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PatchFieldCategoryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t.toLowerCase();
  })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'code chỉ gồm chữ, số và dấu gạch dưới',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
