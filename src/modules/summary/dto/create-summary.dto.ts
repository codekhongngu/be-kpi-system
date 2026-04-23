import { IsUUID } from 'class-validator';

export class CreateSummaryDto {
  @IsUUID()
  formId: string;

  @IsUUID()
  periodId: string;

  @IsUUID()
  orgId: string;
}
