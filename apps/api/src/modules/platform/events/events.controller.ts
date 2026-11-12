import type { ServerResponse } from 'node:http';
import { Controller, Get, Res } from '@nestjs/common';
import { EVENTS_ROUTE } from '@bbartolome/scriba-contracts/platform';
import { EventsPublisher } from './events.publisher';

// Opens the one multiplexed stream. `@Res()` makes Nest write no response; the publisher owns it.
@Controller()
export class EventsController {
  constructor(private readonly publisher: EventsPublisher) {}

  @Get(EVENTS_ROUTE)
  events(@Res() res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    });
    this.publisher.subscribe(res);
  }
}
