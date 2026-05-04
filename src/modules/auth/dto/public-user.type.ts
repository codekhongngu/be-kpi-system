import { User } from '../../user/entities/user.entity';

export type PublicUser = Omit<
  User,
  | 'passwordHash'
  | 'deletedAt'
  | 'totpSecret'
  | 'failedLoginAttempts'
  | 'lockedUntil'
>;
