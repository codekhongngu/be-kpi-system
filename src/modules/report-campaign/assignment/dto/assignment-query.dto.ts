import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PeriodType } from '../../../../common';

export class AssignmentQueryDto {
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
  @Type(() => Boolean)
  @IsBoolean()
  isCancelled?: boolean;

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


