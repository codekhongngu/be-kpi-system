import { PublicUser } from './public-user.type';

export class AuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: PublicUser;
  expiresIn: number;
}
