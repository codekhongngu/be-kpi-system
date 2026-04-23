import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** ID bản ghi trong bảng `field_categories` (đang hoạt động). */
  @IsUUID()
  @IsNotEmpty()
  fieldCategoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
