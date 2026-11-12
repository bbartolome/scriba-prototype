import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import {
  Inject,
  Injectable,
  Optional,
  type BeforeApplicationShutdown,
} from '@nestjs/common';
import {
  SSE_HEARTBEAT_MS,
  SSE_RETRY_MS,
  type PlatformEvent,
  type SseEnvelope,
} from '@bbartolome/scriba-contracts/platform';
import { BUILD_INFO } from '../build-info';
import {
  DEFAULT_WRITE_BUFFER_LIMIT_BYTES,
  WRITE_BUFFER_LIMIT_BYTES,
} from './events.tuning';

// Fan-out to every open `/events` stream. Modules publish through this class (injected from the
// platform entry file); nothing here validates the envelope, which the publishing module types.
@Injectable()
export class EventsPublisher implements BeforeApplicationShutdown {
  private readonly limit: number;
  private readonly streams = new Set<ServerResponse>();
  private readonly heartbeats = new Map<ServerResponse, NodeJS.Timeout>();
  private isStopping = false;

  constructor(@Optional() @Inject(WRITE_BUFFER_LIMIT_BYTES) limit?: number) {
    this.limit = limit ?? DEFAULT_WRITE_BUFFER_LIMIT_BYTES;
  }

  get stopping(): boolean {
    return this.isStopping;
  }

  // Writes `retry` and the hello, then registers the stream, all in one synchronous step.
  subscribe(res: ServerResponse): void {
    res.on('error', () => this.remove(res));
    res.on('close', () => this.remove(res));
    const hello: PlatformEvent = {
      module: 'platform',
      type: 'hello',
      data: {
        streamId: randomUUID(),
        version: BUILD_INFO.version,
        serverTime: new Date().toISOString(),
      },
    };
    res.write(`retry: ${SSE_RETRY_MS}\n`);
    res.write(`data: ${JSON.stringify(hello)}\n\n`);
    this.streams.add(res);
    this.heartbeats.set(
      res,
      setInterval(() => this.send(res, ': heartbeat\n\n'), SSE_HEARTBEAT_MS),
    );
  }

  publish(envelope: SseEnvelope): void {
    if (this.isStopping) return;
    const block = `data: ${JSON.stringify(envelope)}\n\n`;
    for (const res of [...this.streams]) {
      if (res.destroyed) continue;
      this.send(res, block);
    }
  }

  beforeApplicationShutdown(): void {
    this.isStopping = true;
    // Destroy, not end: a stalled client must not hold server.close().
    for (const res of [...this.streams]) {
      this.remove(res);
      res.destroy();
    }
  }

  private send(res: ServerResponse, block: string): void {
    res.write(block);
    if (res.writableLength > this.limit) {
      this.remove(res);
      res.destroy();
    }
  }

  private remove(res: ServerResponse): void {
    this.streams.delete(res);
    const timer = this.heartbeats.get(res);
    if (timer !== undefined) clearInterval(timer);
    this.heartbeats.delete(res);
  }
}
