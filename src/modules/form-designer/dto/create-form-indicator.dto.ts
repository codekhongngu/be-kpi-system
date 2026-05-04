import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateFormIndicatorDto {
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'parentId phải là định dạng UUID' })
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayIndex?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  dataType: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

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
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  minValue?: string | null;

  @IsOptional()
  @IsString()
  maxValue?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'catalogIndicatorId phải là định dạng UUID' })
  catalogIndicatorId?: string | null;
}
