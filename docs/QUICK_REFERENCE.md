# Quick Reference Guide

Hướng dẫn nhanh sử dụng các tính năng boilerplate trong dự án.

## Import

Tất cả các tính năng có thể được import từ `common`:

```typescript
import {
  // Middleware
  LoggingMiddleware,
  RequestIdMiddleware,
  
  // Filters
  HttpExceptionFilter,
  
  // Pipes
  ParseIntPipe,
  ParseUuidPipe,
  TrimPipe,
  
  // Guards
  RolesGuard,
  ApiKeyGuard,
  
  // Interceptors
  LoggingInterceptor,
  TransformInterceptor,
  TimeoutInterceptor,
  CacheInterceptor,
  
  // Decorators
  Roles,
  Public,
  RequestId,
  IpAddress,
  UserAgent,
  ApiVersion,
} from '../../common';
```

## Sử dụng nhanh

### Middleware

Đã được cấu hình global trong `AppModule`, không cần cấu hình thêm.

### Exception Filter

Đã được cấu hình global trong `main.ts`, tự động xử lý tất cả exceptions.

### Pipes

```typescript
// Validate integer
@Get('posts/:page')
getPosts(@Param('page', ParseIntPipe) page: number) {}

// Validate UUID
@Get('user/:id')
@UsePipes(ParseUuidPipe)
getUser(@Param('id') id: string) {}

// Trim strings
@Post('create')
@UsePipes(TrimPipe)
create(@Body() dto: CreateDto) {}
```

### Guards

```typescript
// JWT Authentication
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {}

// Role-based access
@Get('admin')
@UseGuards(RolesGuard)
@Roles('admin')
getAdminData() {}

// API Key protection
@Get('api')
@UseGuards(ApiKeyGuard)
getApiData() {}
```

### Interceptors

```typescript
// Logging
@Get('data')
@UseInterceptors(LoggingInterceptor)
getData() {}

// Transform response
@Get('data')
@UseInterceptors(TransformInterceptor)
getData() {}

// Timeout (5 seconds)
@Get('slow')
@UseInterceptors(new TimeoutInterceptor(5000))
getSlowData() {}

// Cache (60 seconds)
@Get('cached')
@UseInterceptors(new CacheInterceptor(60000))
getCachedData() {}
```

### Decorators

```typescript
// Get current user
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: User) {}

// Mark route as public
@Get('public')
@Public()
getPublicData() {}

// Get request metadata
@Get('info')
getInfo(
  @RequestId() requestId: string,
  @IpAddress() ip: string,
  @UserAgent() userAgent: string,
) {}
```

## Ví dụ đầy đủ

Xem file `src/modules/example/example.controller.ts` để xem ví dụ sử dụng tất cả các tính năng.

## Cấu hình

### Environment Variables

Thêm vào `.env`:

```env
# API Key for ApiKeyGuard
API_KEY=your-secret-api-key
```

## Best Practices

1. **Controllers**: Chỉ chứa routing logic
2. **Services**: Chứa business logic
3. **Guards**: Bảo vệ routes, kiểm tra permissions
4. **Pipes**: Validate và transform data
5. **Interceptors**: Transform responses, logging, caching
6. **Decorators**: Làm code gọn gàng hơn
