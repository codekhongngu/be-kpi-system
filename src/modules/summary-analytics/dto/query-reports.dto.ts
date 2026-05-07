import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PeriodType } from '../../../common';

export class QueryReportsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  formId?: string;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsOptional()
  @IsString()
  periodCode?: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  deadlineFrom?: string;

  @IsOptional()
  @IsDateString()
  deadlineTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}


