import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class PatchFormDto {
  @ApiPropertyOptional({
    description: 'Mã biểu mẫu (duy nhất)',
    example: 'FM-NEW-CODE',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message:
      'code: chỉ chữ/số, dấu gạch ngang hoặc gạch dưới; tối đa 20 ký tự; ký tự đầu phải là chữ hoặc số',
  })
  code?: string;

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
    (o) => o.fieldCategoryId !== null && o.fieldCategoryId !== undefined,
  )
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
    description: 'Trạng thái hoạt động',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'ID biểu mẫu cha',
    example: null,
  })
  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
