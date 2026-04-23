import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CopyFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsUUID()
  fieldCategoryId?: string;

  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
