import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Body,
  Controller,
  HttpCode,
  Injectable,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import type { ProjectSwitchedData } from '@bbartolome/scriba-contracts/project-store';
import {
  EventsPublisher,
  PlatformModule,
} from '../src/modules/platform/platform.module';
import {
  ProjectStoreModule,
  ProjectStoreService,
} from '../src/modules/project-store/project-store.module';

// What the kit hook has seen, and whether its next call throws.
export type SwitchProbe = { calls: ProjectSwitchedData[]; failNext: boolean };

export interface PlainReply {
  status: number;
  json: unknown;
}

// A test module with a switch hook and a route that calls requireActive. It has no guard, as no guard module is
// imported. The hook writes a marker to /events, so the order of the hook and the event is visible on the stream.
export function activeKitModule(probe: SwitchProbe): Type<unknown> {
  @Injectable()
  class ActiveKitHook {
    constructor(store: ProjectStoreService, events: EventsPublisher) {
      store.onProjectSwitched((event) => {
        if (probe.failNext) throw new Error('hook failed');
        probe.calls.push(event);
        events.publish({
          module: 'platform',
          type: 'hook-called',
          data: event,
        });
      });
    }
  }

  @Controller('api/project-store-test')
  class ActiveKitController {
    constructor(private readonly store: ProjectStoreService) {}

    @Post('require-active')
    @HttpCode(200)
    requireActive(@Body() body: { projectId: string }): Record<string, never> {
      this.store.requireActive(body.projectId);
      return {};
    }
  }

  @Module({
    imports: [PlatformModule, ProjectStoreModule],
    controllers: [ActiveKitController],
    providers: [ActiveKitHook],
  })
  class ActiveKitModule {}

  return ActiveKitModule;
}

// Writes a valid project.yaml into <library>/<folder>, so the folder is an ok project.
export function addOkProject(library: string, folder: string): void {
  const root = join(library, folder);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, 'project.yaml'),
    'schemaVersion: 1\ntitle: Second\ngenrePack: nonfiction\n',
  );
}

// One POST of a JSON body with no cookie and no Origin. The kit app has no guard, so none is needed.
export async function postJsonPlain(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<PlainReply> {
  const response = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: JSON.parse(text) as unknown };
}
