import { Module } from '@nestjs/common';
import {
  EventsPublisher,
  PlatformModule,
  SettingsService,
} from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { ProvidersModule } from '../providers/providers.module';
import { ActiveGenreService } from './active-genre.service';
import { CatalogService } from './catalog.service';
import { ExecutorService } from './executor.service';
import { ToolSwitchesService } from './tool-switches.service';
import { TOOLS_SECTION_DEF } from './tools.section';
import { ToolsController } from './tools.controller';

// Modules outside tool-registry import these from this entry file only.
export { CatalogService } from './catalog.service';
export { ExecutorService } from './executor.service';
export type {
  ToolDetail,
  ToolSummary,
  ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';

const TOOLS_SECTION_REGISTRATION = 'TOOLS_SECTION_REGISTRATION';
const CATALOG_EVENTS_REGISTRATION = 'CATALOG_EVENTS_REGISTRATION';

// Tool registry: the three views of each tool, the enable switch, and the read, validate, render and execute API. The
// tools come from the built-in packs under SCRIBA_PACKS_DIR and from the user pack under the library.
@Module({
  imports: [PlatformModule, ProjectStoreModule, ProvidersModule],
  controllers: [ToolsController],
  providers: [
    {
      provide: TOOLS_SECTION_REGISTRATION,
      inject: [SettingsService],
      useFactory: (settings: SettingsService): true => {
        settings.register(TOOLS_SECTION_DEF);
        return true;
      },
    },
    {
      // One listener for every change the catalog reports: a save, a delete, a toggle or a host-side file found by
      // the re-scan. Each change is published once, as catalog-changed on /events.
      provide: CATALOG_EVENTS_REGISTRATION,
      inject: [CatalogService, EventsPublisher],
      useFactory: (catalog: CatalogService, events: EventsPublisher): true => {
        catalog.onChange((names) => {
          events.publish({
            module: 'tool-registry',
            type: 'catalog-changed',
            data: { names },
          });
        });
        return true;
      },
    },
    ToolSwitchesService,
    ActiveGenreService,
    CatalogService,
    ExecutorService,
  ],
  exports: [CatalogService, ExecutorService],
})
export class ToolRegistryModule {}
