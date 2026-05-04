import {
  Injectable,
  UnauthorizedException,
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
import { AuthRefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { randomBytes, createHash } from 'crypto';
import { PublicUser } from './dto/public-user.type';
import { Organization } from '../organization/entities/organization.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(AuthRefreshToken)
    private readonly refreshTokenRepository: Repository<AuthRefreshToken>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
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

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(
        'Tài khoản đang bị khóa tạm thời, vui lòng thử lại sau',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const maxFailed = this.configService.get<number>('AUTH_MAX_FAILED', 5);
      const lockMinutes = this.configService.get<number>(
        'AUTH_LOCK_MINUTES',
        15,
      );
      const failed = await this.userService.incrementFailedLoginAttempt(
        user.id,
      );
      if (failed >= maxFailed) {
        const lockedUntil = new Date(Date.now() + lockMinutes * 60_000);
        await this.userService.lockUntil(user.id, lockedUntil);
      }
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    await this.userService.resetFailedLoginAttemptsAndUnlock(user.id);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.assertPasswordPolicy(registerDto.password);
    const created = await this.userService.create(
      {
        ...registerDto,
        status: UserStatus.ACTIVE,
      },
      { requireQldlRoleGroups: false },
    );
    const user = await this.userService.findOne(created.id);

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

    this.assertPasswordPolicy(changePasswordDto.newPassword);
    await this.userService.update(userId, {
      password: changePasswordDto.newPassword,
    });

    // revoke all sessions after password change
    await this.refreshTokenRepository.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.sha256Hex(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const passwordReset = this.passwordResetRepository.create({
      user,
      tokenHash,
      expiresAt,
      usedAt: null,
    });
    await this.passwordResetRepository.save(passwordReset);

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    this.assertPasswordPolicy(resetPasswordDto.newPassword);

    const tokenHash = this.sha256Hex(resetPasswordDto.token);
    const passwordReset = await this.passwordResetRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!passwordReset) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const user = passwordReset.user;

    // Update password
    await this.userService.update(user.id, {
      password: resetPasswordDto.newPassword,
    });

    // Mark token as used
    passwordReset.usedAt = new Date();
    await this.passwordResetRepository.save(passwordReset);

    // revoke all sessions after reset
    await this.refreshTokenRepository.update(
      { user: { id: user.id }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.sha256Hex(refreshToken);
    const row = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!row) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = row.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // rotate: revoke old token, issue new token
    row.revokedAt = new Date();
    await this.refreshTokenRepository.save(row);

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.sha256Hex(refreshToken);
      await this.refreshTokenRepository.update(
        { tokenHash, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      return;
    }

    await this.refreshTokenRepository.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId, true); // Load roles and permissions
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    if (user.orgId) {
      const org = await this.organizationRepository.findOne({
        where: { id: user.orgId },
      });
      if (!org || !org.isActive) {
        throw new UnauthorizedException('Đơn vị đã bị khóa hoặc không tồn tại');
      }
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

    const refreshTokenTtlDays = this.configService.get<number>(
      'JWT_REFRESH_TTL_DAYS',
      7,
    );
    const refreshToken = randomBytes(48).toString('hex'); // opaque
    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60_000,
    );
    const tokenHash = this.sha256Hex(refreshToken);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        tokenHash,
        expiresAt,
        revokedAt: null,
        user,
        ipAddress: null,
        userAgent: null,
      }),
    );

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

  private sha256Hex(input: string) {
    return createHash('sha256').update(input).digest('hex');
  }

  private assertPasswordPolicy(password: string) {
    const minLen = this.configService.get<number>('AUTH_PASSWORD_MIN_LEN', 8);
    if (password.length < minLen) {
      throw new BadRequestException(`Mật khẩu phải có ít nhất ${minLen} ký tự`);
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!(hasUpper && hasLower && hasNumber && hasSymbol)) {
      throw new BadRequestException(
        'Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
      );
    }
  }

  private sanitizeUser(user: User): PublicUser {
    const {
      passwordHash,
      deletedAt,
      totpSecret,
      failedLoginAttempts,
      lockedUntil,
      ...sanitized
    } = user;
    return sanitized;
  }
}
