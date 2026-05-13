import { IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ParseFilePipe } from '@nestjs/common';

export class ImportIndicatorsAttributesDto {
  @IsUUID()
  templateId: string;

  @Transform(({ value }) => {
    if (value && value.buffer) {
      return value.buffer;
    }
    return value;
  })
  file: Buffer;
}

export interface ExcelIndicatorRow {
  id: string;
  parentId?: string;
  displayIndex: string;
  code: string;
  name: string;
  unit?: string;
  dataType: string;
  type: string;
  sortOrder: number;
}

export interface ExcelAttributeRow {
  id: string;
  parentId?: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface IndicatorMapping {
  excelId: string;
  apiId: string;
}

export interface AttributeMapping {
  excelId: string;
  apiId: string;
}

export class ImportResult {
  success: boolean;
  message: string;
  indicatorsCreated: number;
  attributesCreated: number;
  indicatorMappings: IndicatorMapping[];
  attributeMappings: AttributeMapping[];
  errors?: string[];
}
