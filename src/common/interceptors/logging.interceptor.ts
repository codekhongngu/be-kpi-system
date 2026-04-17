import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logging interceptor to log method execution time and results
 * Usage: @UseInterceptors(LoggingInterceptor)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();
    const requestId = request['id'] || 'unknown';

    this.logger.log(`[${requestId}] ${method} ${url} - Before...`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log(
            `[${requestId}] ${method} ${url} - After ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${requestId}] ${method} ${url} - Error after ${duration}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
