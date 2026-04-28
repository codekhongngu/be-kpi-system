import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileCategory } from '../entities/file-record.entity';

export class FileQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  category?: FileCategory;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
