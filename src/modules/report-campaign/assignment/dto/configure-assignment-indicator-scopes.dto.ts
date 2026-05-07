import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class OrgIndicatorScopeDto {
  @IsUUID()
  orgId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  indicatorIds: string[];
}

export class ConfigureAssignmentIndicatorScopesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrgIndicatorScopeDto)
  allocations: OrgIndicatorScopeDto[];
}
