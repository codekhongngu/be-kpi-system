import { User } from '../../user/entities/user.entity';

export class AuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: Omit<User, 'passwordHash' | 'deletedAt'>;
  expiresIn: number;
}
