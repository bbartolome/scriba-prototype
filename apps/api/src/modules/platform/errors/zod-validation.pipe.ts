import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

// Parses a request value with a module's contract schema. A ZodError is left to the filter.
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    return this.schema.parse(value);
  }
}
