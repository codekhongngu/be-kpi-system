import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to set required roles for a route
 * Usage: @Roles('admin', 'moderator')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
