import {
  Body,
  Controller,
  HttpCode,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import type {
  PendingChange,
  ProposeInput,
} from '@bbartolome/scriba-contracts/project-store';
import { PlatformModule } from '../src/modules/platform/platform.module';
import {
  PendingService,
  ProjectStoreModule,
} from '../src/modules/project-store/project-store.module';

// A test module that calls the in-process pending provider. The body is passed as it arrives, so propose parses it
// (PST-15 step 5). The graph validator is the test's own check for graphs/*.json (PST-15 decision 11). Its routes sit
// under api/project-store-test, and the module is not in the composed app.
export function pendingKitModule(): Type<unknown> {
  @Controller('api/project-store-test')
  class PendingKitController {
    constructor(private readonly pending: PendingService) {}

    @Post('pending/propose')
    @HttpCode(200)
    propose(@Body() body: unknown): PendingChange {
      return this.pending.propose(body as ProposeInput);
    }

    // A file passes when it parses as JSON and has schemaVersion 1. A parse error throws, and counts as a failure.
    @Post('pending/register-graph-validator')
    @HttpCode(200)
    registerGraphValidator(): Record<string, never> {
      this.pending.registerValidator('graphs/*.json', (content) => {
        const doc = JSON.parse(content) as { schemaVersion?: unknown };
        return doc.schemaVersion === 1;
      });
      return {};
    }
  }

  @Module({
    imports: [PlatformModule, ProjectStoreModule],
    controllers: [PendingKitController],
  })
  class PendingKitModule {}

  return PendingKitModule;
}
