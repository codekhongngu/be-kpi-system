import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { PeriodType } from '../entities/report-period.entity';

export class ReportPeriodQueryDto {
  @IsOptional()
  @IsEnum(PeriodType)
  type?: PeriodType;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value) : undefined))
  from?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? String(value) : undefined))
  to?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @IsPositive()
  limit?: number;
}

