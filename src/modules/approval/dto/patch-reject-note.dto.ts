import { IsNotEmpty, IsString } from 'class-validator';

export class PatchRejectNoteDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
