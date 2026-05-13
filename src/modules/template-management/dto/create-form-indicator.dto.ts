import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateFormIndicatorDto {
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'parentId phải là định dạng UUID' })
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayIndex?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsIn(['number', 'text'])
  dataType!: string;

  @IsOptional()
  @IsString()
  @IsIn(['INPUT', 'TITLE'])
  type?: 'INPUT' | 'TITLE';

  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'catalogIndicatorId phải là định dạng UUID' })
  catalogIndicatorId?: string | null;
}
