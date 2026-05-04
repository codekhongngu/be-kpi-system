import { IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { PeriodType } from '../../../common';

export class DashboardQueryDto {
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
