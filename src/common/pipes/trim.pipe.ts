import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Custom pipe to trim string values
 * Automatically trims whitespace from string inputs
 * Usage: @Body(TrimPipe) dto: CreateUserDto
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  private isObj(obj: any): boolean {
    return typeof obj === 'object' && obj !== null;
  }

  private trim(values: any): any {
    Object.keys(values).forEach((key) => {
      if (this.isObj(values[key])) {
        values[key] = this.trim(values[key]);
      } else if (typeof values[key] === 'string') {
        values[key] = values[key].trim();
      }
    });
    return values;
  }

  transform(values: any, metadata: ArgumentMetadata) {
    const { type } = metadata;
    
    if (this.isObj(values) && (type === 'body' || type === 'query')) {
      return this.trim(values);
    }
    
    return values;
  }
}
