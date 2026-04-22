import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
