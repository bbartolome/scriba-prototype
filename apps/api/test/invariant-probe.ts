import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  Post,
} from '@nestjs/common';
import {
  EventsPublisher,
  PlatformModule,
  SCRIBA_ENV,
  type ScribaEnv,
} from '../src/modules/platform/platform.module';
import { Public } from '../src/modules/setup-auth/public-route.decorator';

// Test-only modules for the invariant tests. None is part of the composed app.
// Each one builds a faulty route for a control to find. No assertion reads their internals.

// A GET that changes the library on every call: the call count goes to a file in the library.
@Controller('api/invariant-probe')
class MutatingGetProbeController {
  private calls = 0;

  constructor(@Inject(SCRIBA_ENV) private readonly env: ScribaEnv) {}

  @Get('mutating-get')
  mutate(): { calls: number } {
    this.calls += 1;
    writeFileSync(
      join(this.env.SCRIBA_BOOKS_DIR, '.scriba', 'invariant-probe.txt'),
      String(this.calls),
    );
    return { calls: this.calls };
  }
}

@Module({ controllers: [MutatingGetProbeController] })
export class MutatingGetProbeModule {}

// A POST with no credential check. The Origin check still applies, because the guard checks it on every mutation.
@Controller('api/invariant-probe')
class UnguardedPostProbeController {
  @Public()
  @Post('unguarded-post')
  @HttpCode(202)
  accept(): void {
    return;
  }
}

@Module({ controllers: [UnguardedPostProbeController] })
export class UnguardedPostProbeModule {}

// A GET that is public without being on the fixed list.
@Controller('api/invariant-probe')
class PublicGetProbeController {
  @Public()
  @Get('public-get')
  read(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [PublicGetProbeController] })
export class PublicGetProbeModule {}

// A GET that publishes an event on every call and writes nothing to the library.
@Controller('api/invariant-probe')
class EventPublishingGetProbeController {
  constructor(private readonly publisher: EventsPublisher) {}

  @Get('publishing-get')
  publish(): { ok: true } {
    this.publisher.publish({
      module: 'platform',
      type: 'probe-published',
      data: {},
    });
    return { ok: true };
  }
}

// PlatformModule is imported so that EventsPublisher can be injected. The composed app imports it too.
@Module({
  imports: [PlatformModule],
  controllers: [EventPublishingGetProbeController],
})
export class EventPublishingGetProbeModule {}
