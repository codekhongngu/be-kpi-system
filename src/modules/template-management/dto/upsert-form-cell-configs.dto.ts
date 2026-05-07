import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
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
  @IsIn(['number', 'text'])
  dataType?: string | null;

  @IsOptional()
  @IsBoolean()
  required?: boolean | null;

  @IsOptional()
  @IsBoolean()
  readOnly?: boolean | null;

  @IsOptional()
  @IsString()
  formula?: string | null;
}

export class UpsertFormCellConfigsDto {
  @IsArray()
  @ArrayMinSize(1)
  items: UpsertFormCellConfigItemDto[];
}
