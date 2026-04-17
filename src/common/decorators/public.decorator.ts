import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark a route as public (skip authentication/authorization)
 * Usage: @Public()
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
