import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ToolsController } from './tools.controller';

// Modules outside tool-registry import these from this entry file only.
export { CatalogService } from './catalog.service';
export type {
  ToolDetail,
  ToolSummary,
  ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';

// Tool registry: the three views of each tool and the read and validate API. The tools come from the built-in packs
// under SCRIBA_PACKS_DIR and from the user pack under the library.
@Module({
  controllers: [ToolsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class ToolRegistryModule {}
