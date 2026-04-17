import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get user agent from request
 * Usage: @UserAgent() userAgent: string
 */
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.get('user-agent') || 'unknown';
  },
);
