import { IsArray, IsObject, IsOptional } from 'class-validator';

export class PivotRequestDto {
  @IsOptional()
  @IsArray()
  rows?: string[];

  @IsOptional()
  @IsArray()
  cols?: string[];

  @IsOptional()
  @IsArray()
  values?: unknown[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
