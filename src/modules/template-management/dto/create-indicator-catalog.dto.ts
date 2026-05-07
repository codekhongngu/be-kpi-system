import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIndicatorCatalogDto {
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
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  dataType: string;
}
