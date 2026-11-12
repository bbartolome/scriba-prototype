import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ECHO_ROUTE,
  echoRequestSchema,
  type EchoRequest,
} from '@bbartolome/scriba-contracts/platform';
import { EventsPublisher } from './events.publisher';

// Diagnostic: emits `platform/echo` events on every open stream (ST-2 latency, Shell tests).
@Controller()
export class EchoController {
  constructor(private readonly publisher: EventsPublisher) {}

  // Answers 202 at once; the echoes follow on the streams.
  @Post(ECHO_ROUTE)
  @HttpCode(202)
  echo(@Body() body: unknown): void {
    const request = echoRequestSchema.parse(body);
    void this.emit(request);
  }

  private async emit({ count, intervalMs }: EchoRequest): Promise<void> {
    for (let seq = 1; seq <= count; seq++) {
      if (this.publisher.stopping) return;
      this.publisher.publish({
        module: 'platform',
        type: 'echo',
        data: { seq, sentAt: new Date().toISOString() },
      });
      if (seq < count) await wait(intervalMs);
    }
  }
}

// setTimeout clamps to 1 ms, so a zero interval waits with setImmediate.
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (ms === 0) setImmediate(() => resolve());
    else setTimeout(() => resolve(), ms);
  });
}
