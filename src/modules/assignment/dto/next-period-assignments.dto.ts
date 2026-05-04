import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class NextPeriodAssignmentsDto {
  @IsUUID()
  fromPeriodId: string;

  @IsUUID()
  toPeriodId: string;

  @IsUUID()
  formId: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}
