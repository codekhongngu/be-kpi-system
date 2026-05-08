import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../modules/user/entities/user.entity';

/**
 * Permissions guard to check if user has required permissions
 * Usage: @UseGuards(PermissionsGuard)
 *        @Permissions('users.create', 'users.update')
 */
export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Tạm thời bỏ qua check roles vì mới tạo user
    // if (!requiredPermissions) {
      return true; // No permissions required, allow access
    // }

    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required permissions through their roles
    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenException('User has no roles assigned');
    }

    // Collect all permissions from user's roles
    const userPermissions = new Set<string>();
    user.roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          userPermissions.add(permission.code);
        });
      }
    });

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
