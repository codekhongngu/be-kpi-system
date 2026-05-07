import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ValidateIndicatorFormulaDto {
  @IsString()
  @MaxLength(2000)
  formula: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @Matches(UUID_REGEX, { message: 'indicatorId phải là định dạng UUID' })
  indicatorId?: string;
}

