import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PeriodType } from '../../../common';

export class NextPeriodAssignmentsDto {
  @IsUUID()
  formId: string;

  @IsEnum(PeriodType)
  fromPeriodType: PeriodType;

  @IsDateString()
  fromPeriodFrom: string;

  @IsDateString()
  fromPeriodTo: string;

  @IsEnum(PeriodType)
  toPeriodType: PeriodType;

  @IsDateString()
  toPeriodFrom: string;

  @IsDateString()
  toPeriodTo: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}
