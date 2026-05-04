import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserStatus } from '../entities/user.entity';

export class UserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  /** Alias cho search (theo tài liệu API) */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  /** Theo hợp đồng QLDL (`isActive`); khác với `status` enum nội bộ. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  /** Ví dụ: `createdAt,desc` hoặc `username,asc` */
  @IsOptional()
  @IsString()
  sort?: string;
}
