import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to set API version for a route
 * Usage: @ApiVersion('v1')
 */
export const API_VERSION_KEY = 'apiVersion';
export const ApiVersion = (version: string) =>
  SetMetadata(API_VERSION_KEY, version);
