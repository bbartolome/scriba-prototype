import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { z } from 'zod';
import { echoRequestSchema } from '@bbartolome/scriba-contracts/platform';
import {
  ModuleError,
  ZodValidationPipe,
} from '../src/modules/platform/platform.module';

// Test-only routes that exercise the error filter. Not part of the composed app.
export const probeSchema = z.object({ count: z.number().int().min(1) });

@Controller('api/platform/probe')
class ProbeController {
  @Post('validate')
  validate(
    @Body(new ZodValidationPipe(probeSchema)) body: z.infer<typeof probeSchema>,
  ): z.infer<typeof probeSchema> {
    return body;
  }

  // A contract schema from packages/contracts (zod 4.6.7), through the same pipe.
  @Post('contract')
  contract(
    @Body(new ZodValidationPipe(echoRequestSchema)) body: unknown,
  ): unknown {
    return body;
  }

  @Post('module-error')
  moduleError(): never {
    throw new ModuleError(
      'PROVIDER_UNREACHABLE',
      502,
      'Provider is unreachable.',
      { provider: 'ollama' },
    );
  }

  @Get('plain-error')
  plainError(): never {
    throw new Error('probe boom');
  }
}

@Module({ controllers: [ProbeController] })
export class ErrorProbeModule {}
