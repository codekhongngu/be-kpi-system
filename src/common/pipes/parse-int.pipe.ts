import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Custom pipe to parse and validate integer values
 * Usage: @Param('id', ParseIntPipe) id: number
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed. "${metadata.data || 'value'}" must be an integer`,
      );
    }

    return val;
  }
}
