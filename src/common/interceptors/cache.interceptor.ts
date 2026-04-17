import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Simple in-memory cache interceptor
 * Usage: @UseInterceptors(new CacheInterceptor(60000)) // Cache for 60 seconds
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(private readonly ttl: number = 60000) {} // Default 60 seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `${method}:${url}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.data);
    }

    // Execute and cache the result
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + this.ttl,
        });
      }),
    );
  }

  /**
   * Clear cache manually
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
