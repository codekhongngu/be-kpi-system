import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PeriodType } from '../../../common';

export class CreateAssignmentsDto {
  @IsUUID()
  formId: string;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsString()
  @MaxLength(30)
  periodCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  periodName?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  orgIds: string[];

  @IsDateString()
  deadlineFrom: string;

  @IsDateString()
  deadlineTo: string;
}
