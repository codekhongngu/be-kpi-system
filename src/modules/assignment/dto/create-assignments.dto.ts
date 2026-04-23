import { ArrayNotEmpty, IsArray, IsDateString, IsUUID } from 'class-validator';

export class CreateAssignmentsDto {
  @IsUUID()
  formId: string;

  @IsUUID()
  periodId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  orgIds: string[];

  @IsDateString()
  deadlineFrom: string;

  @IsDateString()
  deadlineTo: string;
}
