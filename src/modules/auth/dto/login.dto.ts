import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email hoặc username là bắt buộc' })
  @IsString()
  usernameOrEmail: string;

  @IsNotEmpty({ message: 'Mật khẩu là bắt buộc' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}
