import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PeriodType } from '../../../common';

export class CreateSummaryDto {
  @IsUUID()
  formId: string;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsDateString()
  periodFrom: string;

  @IsDateString()
  periodTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  periodCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  periodName?: string;

  @IsUUID()
  orgId: string;
}


