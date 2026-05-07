import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIndicatorCatalogDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dataType?: string;
}
