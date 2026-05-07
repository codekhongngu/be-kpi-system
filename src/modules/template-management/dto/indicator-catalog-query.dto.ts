import { IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class IndicatorCatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
