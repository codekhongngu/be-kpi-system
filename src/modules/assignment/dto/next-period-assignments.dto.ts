import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PeriodType } from '../../../common';

export class NextPeriodAssignmentsDto {
  @IsUUID()
  formId: string;

  @IsEnum(PeriodType)
  fromPeriodType: PeriodType;

  @IsString()
  @MaxLength(30)
  fromPeriodCode: string;

  @IsEnum(PeriodType)
  toPeriodType: PeriodType;

  @IsString()
  @MaxLength(30)
  toPeriodCode: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}
