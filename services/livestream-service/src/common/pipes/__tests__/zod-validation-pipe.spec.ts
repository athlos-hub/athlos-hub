import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation-pipe';

describe('ZodValidationPipe', () => {
  it('should pass valid data', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const pipe = new ZodValidationPipe(schema);

    const result = pipe.transform({ name: 'John', age: 30 });

    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should throw BadRequestException on validation error', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({ name: 'John', age: 'invalid' })).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException on non-ZodError', () => {
    const schema = z.object({ name: z.string() });
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });
});
