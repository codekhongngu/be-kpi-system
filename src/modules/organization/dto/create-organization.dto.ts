import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

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

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsUUID()
  headUserId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
