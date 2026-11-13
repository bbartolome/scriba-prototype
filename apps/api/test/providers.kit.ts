import { Body, Controller, HttpCode, Module, Post } from '@nestjs/common';
import { providerCreateSchema } from '@bbartolome/scriba-contracts/providers';
import { ProvidersModule } from '../src/modules/providers/providers.module';
import { ProvidersRegistry } from '../src/modules/providers/providers.registry';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';

export const CREATE_TEST_PATH = '/api/providers-test/create';

// Test-only route for criterion 4 and the label test. It is not in COMPOSED_MODULES, so the composed app and the
// invariant sweep never see it. MPR-06 replaces it with the real routes.
@Controller('api/providers-test')
class ProvidersTestController {
  constructor(private readonly registry: ProvidersRegistry) {}

  @Post('create')
  @HttpCode(201)
  create(@Body() body: unknown) {
    return this.registry.create(providerCreateSchema.parse(body));
  }
}

@Module({
  imports: [ProvidersModule],
  controllers: [ProvidersTestController],
})
export class ProvidersKitModule {}

// One POST to the test route, with the loopback Host and Origin and the session cookie from sessionCookie.
export function postCreate(
  app: TestApp,
  cookie: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path: CREATE_TEST_PATH,
    body: JSON.stringify(body),
  });
}
