import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PeriodType } from '../../../common/period-type';
import { TemplateType } from '../entities/form.entity';

export class PatchFormDto {
  @ApiPropertyOptional({
    description: 'Tên biểu mẫu',
    example: 'Tên mới của biểu mẫu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Đổi lĩnh vực theo ID; gửi `null` để gỡ liên kết. */
  @ApiPropertyOptional({
    description: 'ID của lĩnh vực (field_categories)',
    example: 'a1b2c3d4-e5f6-4789-a012-000000000001',
  })
  @IsOptional()
  @ValidateIf(
    (o) => o.fieldCategoryRef !== null && o.fieldCategoryRef !== undefined,
  )
  @IsUUID()
  fieldCategoryRef?: string | null;

  @ApiPropertyOptional({
    description: 'Tương thích ngược: ID của lĩnh vực (field_categories)',
    example: 'a1b2c3d4-e5f6-4789-a012-000000000001',
  })
  @IsOptional()
  @ValidateIf((o) => o.fieldCategoryId !== null && o.fieldCategoryId !== undefined)
  @IsUUID()
  fieldCategoryId?: string | null;

  @ApiPropertyOptional({
    description: 'Mô tả biểu mẫu',
    example: 'Mô tả mới...',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

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
  })
  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
