import { PipeTransform, BadRequestException } from '@nestjs/common';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: z.ZodType<T>) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          errors: fromZodError(error),
        });
      }

      throw new BadRequestException('Validation failed');
    }
  }
}
