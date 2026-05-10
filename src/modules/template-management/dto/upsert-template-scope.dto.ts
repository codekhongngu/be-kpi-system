import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

export class TemplateScopeItemDto {
  @IsUUID()
  orgId: string;

  @IsUUID()
  indicatorId: string;
}

export class UpsertTemplateScopesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => TemplateScopeItemDto)
  items: TemplateScopeItemDto[];
}
