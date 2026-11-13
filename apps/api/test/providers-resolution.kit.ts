import { Controller, Get, Module, Query } from '@nestjs/common';
import { ProvidersModule } from '../src/modules/providers/providers.module';
import { ModelResolver } from '../src/modules/providers/providers.resolution';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';

export const RESOLVE_TEST_PATH = '/api/providers-test/resolve';
export const MODELS_TEST_PATH = '/api/providers-test/models';

// Test-only routes for MPR-05. They are not in COMPOSED_MODULES, so the composed app and the invariant sweep never
// see them. MPR-06 adds the real routes; the resolve route stays for criterion 4 (DECISIONS, MPR-05 second draft).
@Controller('api/providers-test')
class ResolutionTestController {
  constructor(private readonly resolver: ModelResolver) {}

  // The target without the key: the route never sends a key.
  @Get('resolve')
  async resolve(@Query('projectId') projectId?: string) {
    const resolved = await this.resolver.resolve({ projectId });
    return {
      config: resolved.config,
      model: resolved.model,
      contextSize: resolved.contextSize,
      source: resolved.source,
      warning: resolved.warning,
    };
  }

  @Get('models')
  async models(@Query('providerId') providerId: string) {
    return { models: await this.resolver.modelList(providerId) };
  }
}

@Module({
  imports: [ProvidersModule],
  controllers: [ResolutionTestController],
})
export class ResolutionKitModule {}

// One GET with the loopback Host and the session cookie from sessionCookie. `path` may carry a query string.
export function getJson(
  app: TestApp,
  cookie: string,
  path: string,
): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}
