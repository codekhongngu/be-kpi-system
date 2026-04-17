import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExampleService } from './example.service';
import {
  // Guards
  RolesGuard,
  ApiKeyGuard,
  // Decorators
  Roles,
  Public,
  RequestId,
  IpAddress,
  UserAgent,
  // Pipes
  ParseIntPipe,
  ParseUuidPipe,
  TrimPipe,
  // Interceptors
  LoggingInterceptor,
  TransformInterceptor,
  TimeoutInterceptor,
  CacheInterceptor,
} from '../../common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Example controller demonstrating all NestJS boilerplate features
 */
@Controller('example')
@UseGuards(JwtAuthGuard) // Apply guard to all routes in this controller
@UseInterceptors(LoggingInterceptor) // Apply interceptor to all routes
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  /**
   * Example: Public route (skip authentication)
   */
  @Get('public')
  @Public() // Skip JWT authentication
  getPublicData() {
    return {
      message: 'This is a public endpoint',
      data: 'No authentication required',
    };
  }

  /**
   * Example: Using custom pipes for parameter validation
   */
  @Get('user/:id')
  @UsePipes(ParseUuidPipe) // Validate UUID format
  getUserById(@Param('id') id: string) {
    return this.exampleService.getUserById(id);
  }

  /**
   * Example: Using ParseIntPipe for integer validation
   */
  @Get('posts/:page')
  getPosts(
    @Param('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return this.exampleService.getPosts(page, limit);
  }

  /**
   * Example: Using TrimPipe to automatically trim request body
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(TrimPipe) // Trim whitespace from body
  createData(@Body() data: any) {
    return this.exampleService.createData(data);
  }

  /**
   * Example: Using Roles decorator and RolesGuard
   */
  @Get('admin-only')
  @UseGuards(RolesGuard)
  @Roles('admin') // Only users with 'admin' role can access
  getAdminData() {
    return {
      message: 'This is admin-only data',
      data: 'Sensitive information',
    };
  }

  /**
   * Example: Using multiple roles
   */
  @Get('moderator')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator') // Users with either role can access
  getModeratorData() {
    return {
      message: 'This is moderator data',
    };
  }

  /**
   * Example: Using API Key Guard
   */
  @Get('api-key-protected')
  @UseGuards(ApiKeyGuard)
  getApiKeyProtectedData() {
    return {
      message: 'This endpoint requires API key',
    };
  }

  /**
   * Example: Using custom decorators to extract request metadata
   */
  @Get('metadata')
  getMetadata(
    @RequestId() requestId: string,
    @IpAddress() ip: string,
    @UserAgent() userAgent: string,
  ) {
    return {
      requestId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example: Using TransformInterceptor to wrap response
   */
  @Get('transformed')
  @UseInterceptors(TransformInterceptor)
  getTransformedData() {
    return {
      message: 'This response will be wrapped in standard format',
      data: { key: 'value' },
    };
  }

  /**
   * Example: Using TimeoutInterceptor
   */
  @Get('timeout')
  @UseInterceptors(new TimeoutInterceptor(5000)) // 5 second timeout
  async getDataWithTimeout() {
    // Simulate long-running operation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { message: 'This request has a 5 second timeout' };
  }

  /**
   * Example: Using CacheInterceptor
   */
  @Get('cached')
  @UseInterceptors(new CacheInterceptor(60000)) // Cache for 60 seconds
  getCachedData() {
    return {
      message: 'This response will be cached',
      data: Math.random(), // This value will be cached
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example: Combining multiple interceptors
   */
  @Get('combined')
  @UseInterceptors(
    LoggingInterceptor,
    TransformInterceptor,
    new TimeoutInterceptor(10000),
  )
  getCombinedFeatures() {
    return {
      message: 'This endpoint uses multiple interceptors',
      features: ['logging', 'transformation', 'timeout'],
    };
  }
}
