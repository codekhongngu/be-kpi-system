import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get request ID from request object
 * Usage: @RequestId() requestId: string
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request['id'] || request.headers['x-request-id'] || 'unknown';
  },
);
