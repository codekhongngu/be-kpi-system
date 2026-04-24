import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateFormDto {
  /**
   * Mã biểu mẫu (tuỳ chọn). Nếu bỏ trống hệ thống tự sinh dạng `FM-XXXXXX`.
   * Trùng mã (kể cả bản đã soft-delete) → 409.
   */
  @ApiPropertyOptional({
    description: 'Mã biểu mẫu. Nếu bỏ trống hệ thống tự sinh dạng FM-XXXXXX',
    example: 'FM-TEST-01',
    maxLength: 20,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message:
      'code: chỉ chữ/số, dấu gạch ngang hoặc gạch dưới; tối đa 20 ký tự; ký tự đầu phải là chữ hoặc số',
  })
  code?: string;

  @ApiProperty({
    description: 'Tên biểu mẫu',
    example: 'Biểu mẫu báo cáo quý I',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** ID bản ghi trong bảng `field_categories` (đang hoạt động). */
  @ApiProperty({
    description: 'ID của lĩnh vực (field_categories)',
    example: 'a1b2c3d4-e5f6-4789-a012-000000000001',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldCategoryId: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết biểu mẫu',
    example: 'Biểu mẫu dùng để thu thập dữ liệu...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID biểu mẫu cha (nếu là biểu mẫu con)',
    example: null,
  })
  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
