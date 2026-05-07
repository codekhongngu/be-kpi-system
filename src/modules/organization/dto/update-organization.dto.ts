import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  /**
   * Cho phép set null rõ ràng cho parent/head theo spec PatchOrgRequest.
   */
  @ValidateIf((_, v) => v === null || typeof v === 'string')
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === false) return value;
    const s = String(value).toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return undefined;
  })
  @IsBoolean()
  canAssignReports?: boolean;
}
