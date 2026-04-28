import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  /**
   * Cho phép set null rõ ràng cho parent/head theo spec PatchOrgRequest.
   */
  @ValidateIf((_, v) => v === null || typeof v === 'string')
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ValidateIf((_, v) => v === null || typeof v === 'string')
  @IsOptional()
  @IsUUID()
  headUserId?: string | null;
}
