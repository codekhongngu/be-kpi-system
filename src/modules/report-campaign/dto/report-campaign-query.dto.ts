import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PeriodType } from '../../../common';
import { AssignmentBatchStatus } from '../assignment/entities/assignment-batch.entity';

export class ReportCampaignQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number;

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
  @IsEnum(AssignmentBatchStatus)
  status?: AssignmentBatchStatus;
}

