import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CellChangeDto {
  @IsUUID()
  indicatorId: string;

  @IsUUID()
  attributeId: string;

  @IsOptional()
  @IsString()
  valueText?: string | null;

  @IsOptional()
  @IsString()
  valueNumeric?: string | null;
}

export class PatchCellsDto {
  @IsInt()
  @Min(1)
  clientVersion: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CellChangeDto)
  changes: CellChangeDto[];
}
