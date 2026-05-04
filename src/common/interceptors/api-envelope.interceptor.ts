import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wrap successful HTTP responses into QLDL API envelope:
 * { data, meta?, error: null }
 *
 * Skips streaming/binary responses.
 */
@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<{
      statusCode?: number;
      getHeader?: (n: string) => unknown;
    }>();

    return next.handle().pipe(
      map((body) => {
        const status = res.statusCode ?? 200;
        if (status === 204) return body;

        const contentType = String(res.getHeader?.('content-type') ?? '');
        if (
          contentType.includes('text/event-stream') ||
          contentType.includes('application/octet-stream')
        ) {
          return body;
        }

        if (body && typeof body === 'object' && 'data' in (body as object)) {
          return body;
        }

        return { data: body, meta: undefined, error: null };
      }),
    );
  }
}
