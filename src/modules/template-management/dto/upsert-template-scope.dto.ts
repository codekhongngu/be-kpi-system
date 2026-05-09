import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, Matches, ValidateNested } from 'class-validator';

export class TemplateScopeItemDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'orgId must be a valid UUID format'
  })
  orgId: string;

  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'indicatorId must be a valid UUID format'
  })
  indicatorId: string;
}

export class UpsertTemplateScopesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => TemplateScopeItemDto)
  items: TemplateScopeItemDto[];
}

