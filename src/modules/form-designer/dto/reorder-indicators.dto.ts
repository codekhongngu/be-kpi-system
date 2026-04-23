import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderIndicatorsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  orderedIds: string[];
}
