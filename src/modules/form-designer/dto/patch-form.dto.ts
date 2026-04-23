import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class PatchFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Đổi lĩnh vực theo ID; gửi `null` để gỡ liên kết. */
  @IsOptional()
  @ValidateIf((o) => o.fieldCategoryId !== null && o.fieldCategoryId !== undefined)
  @IsUUID()
  fieldCategoryId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
