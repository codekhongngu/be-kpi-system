# NestJS Boilerplate Features Documentation

Tài liệu này mô tả chi tiết tất cả các tính năng boilerplate được triển khai trong dự án NestJS này.

## Mục lục

1. [Controllers](#controllers)
2. [Providers](#providers)
3. [Modules](#modules)
4. [Middleware](#middleware)
5. [Exception Filters](#exception-filters)
6. [Pipes](#pipes)
7. [Guards](#guards)
8. [Interceptors](#interceptors)
9. [Custom Decorators](#custom-decorators)

---

## Controllers

Controllers là lớp xử lý các HTTP requests và trả về responses cho client.

### Cấu trúc cơ bản

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Get()
  findAll() {
    return 'This action returns all users';
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action creates a user';
  }
}
```

### Ví dụ trong dự án

- **AuthController** (`src/modules/auth/auth.controller.ts`): Xử lý authentication (login, register, logout, etc.)
- **UserController** (`src/modules/user/user.controller.ts`): Xử lý CRUD operations cho users
- **ExampleController** (`src/modules/example/example.controller.ts`): Ví dụ minh họa tất cả các tính năng

### Các decorators phổ biến

- `@Controller('route')`: Định nghĩa route prefix
- `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`: HTTP methods
- `@Body()`: Lấy dữ liệu từ request body
- `@Param('id')`: Lấy parameter từ URL
- `@Query()`: Lấy query parameters
- `@Headers()`: Lấy headers từ request

---

## Providers

Providers là các class có thể được inject vào các class khác thông qua dependency injection. Service là loại provider phổ biến nhất.

### Cấu trúc cơ bản

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  findAll() {
    return [];
  }

  create(data: any) {
    return data;
  }
}
```

### Ví dụ trong dự án

- **AuthService** (`src/modules/auth/auth.service.ts`): Xử lý logic authentication
- **UserService** (`src/modules/user/user.service.ts`): Xử lý business logic cho users
- **AppService** (`src/app.service.ts`): Service cấp ứng dụng

### Dependency Injection

```typescript
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }
}
```

---

## Modules

Modules là cách tổ chức code trong NestJS. Mỗi module đóng gói một phần chức năng của ứng dụng.

### Cấu trúc cơ bản

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export để sử dụng ở module khác
})
export class UserModule {}
```

### Ví dụ trong dự án

- **AppModule** (`src/app.module.ts`): Root module, import tất cả modules khác
- **AuthModule** (`src/modules/auth/auth.module.ts`): Module xử lý authentication
- **UserModule** (`src/modules/user/user.module.ts`): Module quản lý users

### Module metadata

- `imports`: Import các modules khác
- `controllers`: Khai báo controllers
- `providers`: Khai báo providers
- `exports`: Export providers để modules khác sử dụng

---

## Middleware

Middleware là các function được thực thi trước khi request đến route handler. Có thể thực hiện logging, authentication, validation, etc.

### Middleware có sẵn trong dự án

#### 1. LoggingMiddleware

Ghi log tất cả requests và responses với thông tin chi tiết.

**File**: `src/common/middleware/logging.middleware.ts`

**Tính năng**:
- Log method, URL, IP, user agent khi request đến
- Log status code, content length, duration khi response trả về

**Cấu hình**: Đã được cấu hình global trong `AppModule`

#### 2. RequestIdMiddleware

Tạo và gán request ID cho mỗi request để tracking.

**File**: `src/common/middleware/request-id.middleware.ts`

**Tính năng**:
- Tạo UUID nếu request không có `x-request-id` header
- Gán request ID vào request object
- Trả về request ID trong response header `X-Request-Id`

**Cấu hình**: Đã được cấu hình global trong `AppModule`

### Cách sử dụng

Middleware đã được cấu hình global trong `AppModule`:

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, LoggingMiddleware)
      .forRoutes('*'); // Áp dụng cho tất cả routes
  }
}
```

### Tạo middleware mới

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class MyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Your logic here
    next();
  }
}
```

---

## Exception Filters

Exception filters xử lý các exceptions được throw trong ứng dụng và format response trả về cho client.

### HttpExceptionFilter

**File**: `src/common/filters/http-exception.filter.ts`

**Tính năng**:
- Bắt tất cả exceptions (HttpException và các exceptions khác)
- Format response theo chuẩn thống nhất
- Log errors với thông tin chi tiết
- Bao gồm request ID trong response

**Response format**:
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users",
  "method": "GET",
  "message": "Error message",
  "error": "Bad Request",
  "requestId": "uuid-here"
}
```

**Cấu hình**: Đã được cấu hình global trong `main.ts`

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

### Sử dụng HttpException

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Get(':id')
findOne(@Param('id') id: string) {
  if (!id) {
    throw new BadRequestException('ID is required');
  }
  
  const user = this.userService.findOne(id);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  return user;
}
```

### Tạo custom exception filter

```typescript
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

@Catch(MyCustomException)
export class MyExceptionFilter implements ExceptionFilter {
  catch(exception: MyCustomException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
    });
  }
}
```

---

## Pipes

Pipes được sử dụng để transform và validate dữ liệu trước khi đến route handler.

### Pipes có sẵn trong dự án

#### 1. ParseIntPipe

Chuyển đổi và validate string thành integer.

**File**: `src/common/pipes/parse-int.pipe.ts`

**Sử dụng**:
```typescript
@Get('posts/:page')
getPosts(@Param('page', ParseIntPipe) page: number) {
  // page sẽ là number, không phải string
  return this.service.getPosts(page);
}
```

#### 2. ParseUuidPipe

Validate UUID format.

**File**: `src/common/pipes/parse-uuid.pipe.ts`

**Sử dụng**:
```typescript
@Get('user/:id')
@UsePipes(ParseUuidPipe)
getUserById(@Param('id') id: string) {
  // id sẽ được validate là UUID hợp lệ
  return this.service.getUserById(id);
}
```

#### 3. TrimPipe

Tự động trim whitespace từ string inputs.

**File**: `src/common/pipes/trim.pipe.ts`

**Sử dụng**:
```typescript
@Post('create')
@UsePipes(TrimPipe)
create(@Body() dto: CreateDto) {
  // Tất cả string fields trong dto sẽ được trim
  return this.service.create(dto);
}
```

### ValidationPipe (Built-in)

NestJS cung cấp `ValidationPipe` sử dụng `class-validator`:

**Cấu hình trong `main.ts`**:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Loại bỏ properties không có decorator
    forbidNonWhitelisted: true, // Throw error nếu có properties không hợp lệ
    transform: true, // Tự động transform payloads
  }),
);
```

**Sử dụng với DTO**:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### Tạo custom pipe

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class MyPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Transform logic
    if (!value) {
      throw new BadRequestException('Value is required');
    }
    return value;
  }
}
```

---

## Guards

Guards xác định xem request có được phép tiếp tục hay không. Thường dùng cho authentication và authorization.

### Guards có sẵn trong dự án

#### 1. JwtAuthGuard

Guard xác thực JWT token (đã có sẵn).

**File**: `src/modules/auth/guards/jwt-auth.guard.ts`

**Sử dụng**:
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {
  return user;
}
```

#### 2. RolesGuard

Guard kiểm tra quyền truy cập dựa trên roles.

**File**: `src/common/guards/roles.guard.ts`

**Sử dụng**:
```typescript
import { Roles } from '../../common';

@Get('admin')
@UseGuards(RolesGuard)
@Roles('admin')
getAdminData() {
  return { message: 'Admin only' };
}

@Get('moderator')
@UseGuards(RolesGuard)
@Roles('admin', 'moderator') // Có thể có nhiều roles
getModeratorData() {
  return { message: 'Moderator or admin' };
}
```

**Lưu ý**: Cần cập nhật logic trong `RolesGuard` để phù hợp với cấu trúc User entity của bạn.

#### 3. ApiKeyGuard

Guard bảo vệ routes bằng API key.

**File**: `src/common/guards/api-key.guard.ts`

**Cấu hình**: Thêm `API_KEY` vào `.env`:
```
API_KEY=your-secret-api-key
```

**Sử dụng**:
```typescript
import { ApiKeyGuard } from '../../common';

@Get('protected')
@UseGuards(ApiKeyGuard)
getProtectedData() {
  return { message: 'Protected by API key' };
}
```

**Request header**:
```
X-API-Key: your-secret-api-key
```

### Tạo custom guard

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class MyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Your logic here
    return true; // Return false để từ chối request
  }
}
```

---

## Interceptors

Interceptors có thể thực hiện logic trước và sau khi route handler được gọi. Có thể transform request/response, log, cache, etc.

### Interceptors có sẵn trong dự án

#### 1. LoggingInterceptor

Ghi log thời gian thực thi của route handler.

**File**: `src/common/interceptors/logging.interceptor.ts`

**Sử dụng**:
```typescript
import { LoggingInterceptor } from '../../common';

@Get('data')
@UseInterceptors(LoggingInterceptor)
getData() {
  return { message: 'Data' };
}
```

**Output**: Logs method, URL, duration, request ID

#### 2. TransformInterceptor

Wrap response trong format chuẩn.

**File**: `src/common/interceptors/transform.interceptor.ts`

**Sử dụng**:
```typescript
import { TransformInterceptor } from '../../common';

@Get('data')
@UseInterceptors(TransformInterceptor)
getData() {
  return { key: 'value' };
}
```

**Response format**:
```json
{
  "success": true,
  "data": { "key": "value" },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/data"
}
```

#### 3. TimeoutInterceptor

Giới hạn thời gian thực thi của request.

**File**: `src/common/interceptors/timeout.interceptor.ts`

**Sử dụng**:
```typescript
import { TimeoutInterceptor } from '../../common';

@Get('slow')
@UseInterceptors(new TimeoutInterceptor(5000)) // 5 seconds
async getSlowData() {
  // Nếu mất hơn 5 giây sẽ throw RequestTimeoutException
  return await this.service.getSlowData();
}
```

#### 4. CacheInterceptor

Cache response trong memory (chỉ GET requests).

**File**: `src/common/interceptors/cache.interceptor.ts`

**Sử dụng**:
```typescript
import { CacheInterceptor } from '../../common';

@Get('cached')
@UseInterceptors(new CacheInterceptor(60000)) // Cache 60 seconds
getCachedData() {
  return { data: Math.random() }; // Giá trị này sẽ được cache
}
```

### Sử dụng nhiều interceptors

```typescript
@Get('combined')
@UseInterceptors(
  LoggingInterceptor,
  TransformInterceptor,
  new TimeoutInterceptor(10000),
)
getCombined() {
  return { message: 'Multiple interceptors' };
}
```

### Tạo custom interceptor

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class MyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Logic trước khi handler được gọi
    return next.handle().pipe(
      map((data) => {
        // Transform response
        return { data };
      }),
    );
  }
}
```

---

## Custom Decorators

Decorators tùy chỉnh giúp code gọn gàng và dễ đọc hơn.

### Decorators có sẵn trong dự án

#### 1. @CurrentUser()

Lấy user hiện tại từ request (đã có sẵn).

**File**: `src/modules/auth/decorators/current-user.decorator.ts`

**Sử dụng**:
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: User) {
  return user;
}
```

#### 2. @Roles()

Đặt roles required cho route (dùng với RolesGuard).

**File**: `src/common/decorators/roles.decorator.ts`

**Sử dụng**:
```typescript
import { Roles } from '../../common';

@Get('admin')
@UseGuards(RolesGuard)
@Roles('admin')
getAdminData() {
  return { message: 'Admin only' };
}
```

#### 3. @Public()

Đánh dấu route là public (skip authentication).

**File**: `src/common/decorators/public.decorator.ts`

**Sử dụng**:
```typescript
import { Public } from '../../common';

@Get('public')
@Public() // Skip JWT authentication
getPublicData() {
  return { message: 'Public endpoint' };
}
```

#### 4. @RequestId()

Lấy request ID từ request.

**File**: `src/common/decorators/request-id.decorator.ts`

**Sử dụng**:
```typescript
import { RequestId } from '../../common';

@Get('data')
getData(@RequestId() requestId: string) {
  return { requestId, data: 'value' };
}
```

#### 5. @IpAddress()

Lấy IP address của client.

**File**: `src/common/decorators/ip-address.decorator.ts`

**Sử dụng**:
```typescript
import { IpAddress } from '../../common';

@Post('login')
login(@Body() dto: LoginDto, @IpAddress() ip: string) {
  return this.authService.login(dto, ip);
}
```

#### 6. @UserAgent()

Lấy user agent từ request.

**File**: `src/common/decorators/user-agent.decorator.ts`

**Sử dụng**:
```typescript
import { UserAgent } from '../../common';

@Post('login')
login(@Body() dto: LoginDto, @UserAgent() userAgent: string) {
  return this.authService.login(dto, undefined, userAgent);
}
```

#### 7. @ApiVersion()

Đặt API version cho route (có thể dùng với versioning).

**File**: `src/common/decorators/api-version.decorator.ts`

**Sử dụng**:
```typescript
import { ApiVersion } from '../../common';

@Get('data')
@ApiVersion('v1')
getData() {
  return { version: 'v1', data: 'value' };
}
```

### Tạo custom decorator

#### Parameter Decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const MyParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.myProperty;
  },
);
```

**Sử dụng**:
```typescript
@Get('data')
getData(@MyParam() value: string) {
  return { value };
}
```

#### Metadata Decorator

```typescript
import { SetMetadata } from '@nestjs/common';

export const MyMetadata = (value: string) => SetMetadata('myKey', value);
```

**Sử dụng**:
```typescript
@Get('data')
@MyMetadata('myValue')
getData() {
  return { data: 'value' };
}
```

---

## Ví dụ sử dụng tổng hợp

Xem file `src/modules/example/example.controller.ts` để xem ví dụ sử dụng tất cả các tính năng trên.

### Endpoints mẫu

1. **Public endpoint**: `GET /api/example/public`
2. **UUID validation**: `GET /api/example/user/:id`
3. **Integer validation**: `GET /api/example/posts/:page`
4. **Trim pipe**: `POST /api/example/create`
5. **Roles guard**: `GET /api/example/admin-only`
6. **API key guard**: `GET /api/example/api-key-protected`
7. **Custom decorators**: `GET /api/example/metadata`
8. **Transform interceptor**: `GET /api/example/transformed`
9. **Timeout interceptor**: `GET /api/example/timeout`
10. **Cache interceptor**: `GET /api/example/cached`

---

## Best Practices

1. **Controllers**: Chỉ nên chứa logic routing, không nên chứa business logic
2. **Services**: Chứa business logic, có thể được inject vào nhiều controllers
3. **Modules**: Tổ chức code theo feature, mỗi feature một module
4. **Middleware**: Dùng cho cross-cutting concerns (logging, authentication, etc.)
5. **Exception Filters**: Xử lý errors một cách nhất quán
6. **Pipes**: Validate và transform data trước khi đến handler
7. **Guards**: Bảo vệ routes, kiểm tra permissions
8. **Interceptors**: Transform responses, logging, caching
9. **Decorators**: Làm code gọn gàng và dễ đọc hơn

---

## Tài liệu tham khảo

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS Controllers](https://docs.nestjs.com/controllers)
- [NestJS Providers](https://docs.nestjs.com/providers)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [NestJS Middleware](https://docs.nestjs.com/middleware)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS Pipes](https://docs.nestjs.com/pipes)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
