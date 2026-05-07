import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateFormAttributeDto {
  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'parentId phải là định dạng UUID' })
  parentId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['number', 'text'])
  dataType?: string | null;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadonly?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  validationRule?: Record<string, unknown> | null;
}
