import { Module } from '@nestjs/common';
import { CatalogService, TOOL_SOURCE } from './catalog.service';
import { COLD_OPEN_ENTRY } from './cold-open';
import { ToolsController } from './tools.controller';

// Modules outside tool-registry import these from this entry file only.
export { CatalogService } from './catalog.service';
export type {
  ToolDetail,
  ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';

// Tool registry: the three views of each tool and the read and validate API. The tools come from the fixture until TRG-06.
@Module({
  controllers: [ToolsController],
  providers: [
    { provide: TOOL_SOURCE, useValue: [COLD_OPEN_ENTRY] },
    CatalogService,
  ],
  exports: [CatalogService],
})
export class ToolRegistryModule {}
