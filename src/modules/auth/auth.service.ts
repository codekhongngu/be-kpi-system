import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { User, UserStatus } from '../user/entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByUsernameOrEmail(
      loginDto.usernameOrEmail,
      false, // Don't load relations during login to avoid errors
    );

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.userService.create({
      ...registerDto,
      status: UserStatus.ACTIVE,
    });

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userService.findOne(userId);

    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.passwordHash,
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không chính xác');
    }

    await this.userService.update(userId, {
      password: changePasswordDto.newPassword,
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save or update password reset record
    const existingReset = await this.passwordResetRepository.findOne({
      where: { email: user.email },
    });

    if (existingReset) {
      existingReset.token = token;
      existingReset.expiresAt = expiresAt;
      existingReset.usedAt = null;
      await this.passwordResetRepository.save(existingReset);
    } else {
      const passwordReset = this.passwordResetRepository.create({
        email: user.email,
        token,
        expiresAt,
      });
      await this.passwordResetRepository.save(passwordReset);
    }

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const passwordReset = await this.passwordResetRepository.findOne({
      where: {
        token: resetPasswordDto.token,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userService.findByEmail(passwordReset.email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Update password
    await this.userService.update(user.id, {
      password: resetPasswordDto.newPassword,
    });

    // Mark token as used
    passwordReset.usedAt = new Date();
    await this.passwordResetRepository.save(passwordReset);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userService.findOne(payload.sub);
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Tài khoản đã bị khóa');
      }

      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: this.sanitizeUser(user),
      };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId, true); // Load roles and permissions
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }
    // Ensure roles is always an array, even if empty
    if (!user.roles) {
      user.roles = [];
    }
    return user;
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    } as any);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'your-refresh-secret-key',
      ),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    } as any);

    const expiresIn = this.configService.get<number>(
      'JWT_EXPIRES_IN_SECONDS',
      3600,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash' | 'deletedAt'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, deletedAt, ...sanitized } = user;
    return sanitized;
  }
}
