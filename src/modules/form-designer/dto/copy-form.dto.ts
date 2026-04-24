import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CopyFormDto {
  @ApiPropertyOptional({
    description: 'Mã biểu mẫu mới (tuỳ chọn)',
    example: 'FM-COPY-01',
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

  @ApiProperty({
    description: 'Tên biểu mẫu mới',
    example: 'Bản sao của Biểu mẫu A',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'ID lĩnh vực mới (nếu muốn đổi)',
  })
  @IsOptional()
  @IsUUID()
  fieldCategoryId?: string;

  @ApiPropertyOptional({
    description: 'ID biểu mẫu cha mới',
  })
  @IsOptional()
  @IsUUID()
  parentFormId?: string | null;
}
