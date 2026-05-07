import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AnalyticsKpiQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;
}
