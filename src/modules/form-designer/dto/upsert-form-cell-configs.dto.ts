import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class UpsertFormCellConfigItemDto {
  @IsString()
  @Matches(UUID_REGEX, { message: 'indicatorId phải là định dạng UUID' })
  indicatorId: string;

  @IsString()
  @Matches(UUID_REGEX, { message: 'attributeId phải là định dạng UUID' })
  attributeId: string;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;

  @IsOptional()
  @IsObject()
  validationRule?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  defaultValue?: string | null;

  @IsOptional()
  @IsIn(['number', 'text'])
  dataType?: string | null;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean | null;

  @IsOptional()
  @IsString()
  formula?: string | null;
}

export class UpsertFormCellConfigsDto {
  @IsArray()
  @ArrayMinSize(1)
  items: UpsertFormCellConfigItemDto[];
}

