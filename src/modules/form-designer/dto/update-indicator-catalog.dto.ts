import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIndicatorCatalogDto {
  @IsOptional()
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
