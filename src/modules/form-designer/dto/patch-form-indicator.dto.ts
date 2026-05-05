import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PatchFormIndicatorDto {
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'parentId phải là định dạng UUID' })
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayIndex?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['number', 'text'])
  dataType?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @IsOptional()
  @IsBoolean()
  isCalculated?: boolean;

  @IsOptional()
  @IsString()
  formula?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  groupName?: string | null;

  @IsOptional()
  @IsString()
  minValue?: string | null;

  @IsOptional()
  @IsString()
  maxValue?: string | null;

  @IsOptional()
  @IsObject()
  validationRule?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'catalogIndicatorId phải là định dạng UUID' })
  catalogIndicatorId?: string | null;
}
