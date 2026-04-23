import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PeriodType } from '../../report-period/entities/report-period.entity';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fieldCategory: string;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
