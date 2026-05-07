import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PeriodType } from '../../../common/period-type';
import { TemplateStatus, TemplateType } from '../entities/form.entity';

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
    description: 'Alias tương thích: fieldCategoryId',
    example: 'a1b2c3d4-e5f6-4789-a012-000000000001',
  })
  @IsOptional()
  @IsUUID()
  fieldCategoryRef?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết biểu mẫu',
    example: 'Biểu mẫu dùng để thu thập dữ liệu...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Kỳ báo cáo',
    enum: PeriodType,
    example: PeriodType.THANG,
  })
  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @ApiPropertyOptional({
    description: 'Loai bieu mau',
    enum: TemplateType,
    example: TemplateType.AGGREGATE,
  })
  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @ApiPropertyOptional({
    description: 'Trang thai bieu mau',
    enum: TemplateStatus,
    example: TemplateStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TemplateStatus)
  templateStatus?: TemplateStatus;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
