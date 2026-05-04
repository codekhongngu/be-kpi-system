import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PeriodType } from '../entities/report-period.entity';

export class CreateReportPeriodDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
