import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

export class ReportCampaignScopeItemDto {
  @IsUUID()
  orgId: string;

  @IsUUID()
  indicatorId: string;
}

export class UpsertReportCampaignScopesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => ReportCampaignScopeItemDto)
  items: ReportCampaignScopeItemDto[];
}
