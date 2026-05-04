import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReorderItemDto {
  @IsString()
  @Matches(UUID_REGEX, { message: 'id phải là định dạng UUID' })
  id: string;

  @IsOptional()
  @ValidateIf((o) => o.parentId !== null)
  @IsString()
  @Matches(UUID_REGEX, { message: 'parentId phải là định dạng UUID' })
  parentId?: string | null;
}

export class ReorderAttributesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
