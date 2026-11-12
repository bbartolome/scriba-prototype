import type { PipeTransform } from '@nestjs/common';

// Parses a request value with a module's contract schema. A ZodError is left to the filter.
// The parameter is structural, so a schema from either zod copy (the app's and the contracts') fits.
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema: { parse(value: unknown): unknown }) {}

  transform(value: unknown): unknown {
    return this.schema.parse(value);
  }
}
