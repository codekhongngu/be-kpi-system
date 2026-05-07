import { IsOptional, IsString } from 'class-validator';

export class UpdateReportCampaignDto {
  @IsOptional()
  @IsString()
  periodName?: string;

  @IsOptional()
  @IsString()
  deadlineFrom?: string;

  @IsOptional()
  @IsString()
  deadlineTo?: string;
}
