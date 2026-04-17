import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../modules/user/entities/user.entity';

/**
 * Roles guard to check if user has required roles
 * Usage: @UseGuards(RolesGuard)
 *        @Roles('admin', 'moderator')
 */
export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    // Load roles if not already loaded
    if (!user.roles) {
      throw new ForbiddenException('User roles not loaded');
    }

    const userRoleCodes = user.roles.map((role) => role.code);
    const hasRole = requiredRoles.some((role) =>
      userRoleCodes.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
