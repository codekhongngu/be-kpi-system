import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

function toBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

export class OrganizationClosureQueryDto {
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  includeSelf?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  isActive?: boolean;
}

