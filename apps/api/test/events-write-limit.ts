import { Global, Module } from '@nestjs/common';
import { WRITE_BUFFER_LIMIT_BYTES } from '../src/modules/platform/events/events.tuning';

// Test only: lowers the publisher's write limit to 256 KiB, so AC 5 fills a stalled stream quickly.
@Global()
@Module({
  providers: [{ provide: WRITE_BUFFER_LIMIT_BYTES, useValue: 256 * 1024 }],
  exports: [WRITE_BUFFER_LIMIT_BYTES],
})
export class WriteLimitModule {}
