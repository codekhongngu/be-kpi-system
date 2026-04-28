import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PeriodType } from '../entities/report-period.entity';

export class CreateReportPeriodDto {
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
