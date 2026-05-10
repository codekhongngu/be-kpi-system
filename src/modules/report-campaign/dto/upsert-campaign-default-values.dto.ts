import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CampaignDefaultValueItemDto {
  @IsUUID()
  indicatorId: string;

  @IsUUID()
  attributeId: string;

  @IsOptional()
  @IsString()
  valueText?: string | null;

  @IsOptional()
  @IsNumber()
  valueNumber?: number | null;
}

export class UpsertCampaignDefaultValuesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => CampaignDefaultValueItemDto)
  items: CampaignDefaultValueItemDto[];
}

export class DeleteCampaignDefaultValueItemDto {
  @IsUUID()
  indicatorId: string;

  @IsUUID()
  attributeId: string;
}

export class DeleteCampaignDefaultValuesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => DeleteCampaignDefaultValueItemDto)
  items: DeleteCampaignDefaultValueItemDto[];
}
