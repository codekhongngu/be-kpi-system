import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Token là bắt buộc' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'Mật khẩu mới là bắt buộc' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}
