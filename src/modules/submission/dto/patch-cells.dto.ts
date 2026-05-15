import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
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
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  })
  @IsNumber()
  valueNumber?: number | null;
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
