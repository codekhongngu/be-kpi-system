import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class PatchFieldCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'code chỉ gồm chữ thường, số và dấu gạch dưới',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
