import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/permissions.guard';

/**
 * Decorator to set required permissions for a route
 * Usage: @Permissions('users.create', 'users.update')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
