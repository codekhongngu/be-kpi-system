import { ArrayMinSize, IsArray, IsString, Matches } from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class DeleteFormCellConfigItemDto {
  @IsString()
  @Matches(UUID_REGEX, { message: 'indicatorId phải là định dạng UUID' })
  indicatorId: string;

  @IsString()
  @Matches(UUID_REGEX, { message: 'attributeId phải là định dạng UUID' })
  attributeId: string;
}

export class DeleteFormCellConfigsDto {
  @IsArray()
  @ArrayMinSize(1)
  items: DeleteFormCellConfigItemDto[];
}

