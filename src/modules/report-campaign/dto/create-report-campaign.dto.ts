import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PeriodType } from '../../../common';

export class CreateReportCampaignDto {
  @IsUUID()
  formId: string;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsString()
  @IsNotEmpty()
  periodCode: string;

  @IsOptional()
  @IsString()
  periodName?: string;

  @IsString()
  @IsNotEmpty()
  deadlineFrom: string;

  @IsString()
  @IsNotEmpty()
  deadlineTo: string;
}


