import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendRemindersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  assignmentIds: string[];

  @IsOptional()
  @IsString()
  message?: string;
}
