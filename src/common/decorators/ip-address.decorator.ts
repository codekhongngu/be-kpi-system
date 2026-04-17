import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get client IP address from request
 * Usage: @IpAddress() ip: string
 */
export const IpAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.headers['x-forwarded-for']?.split(',')[0] ||
      'unknown'
    );
  },
);
