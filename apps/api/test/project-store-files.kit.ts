import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  Body,
  Controller,
  HttpCode,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import {
  PROJECT_FILE_EDIT_ROUTE,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_FILES_ROUTE,
  type FileEdit,
  type FileList,
  type FileWrite,
} from '@bbartolome/scriba-contracts/project-store';
import { PlatformModule } from '../src/modules/platform/platform.module';
import {
  FilesService,
  ProjectStoreModule,
} from '../src/modules/project-store/project-store.module';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import {
  buildProjectsLibrary,
  postJson,
  type ProjectsLibrary,
} from './project-store-projects.kit';

// The settings text that makes `book` the active project (the shape of project-store-section.test.ts line 61).
export const ACTIVE_BOOK_SETTINGS =
  'schemaVersion: 1\nprojects:\n  schemaVersion: 1\n  active: book\n';

// The fixture tree with `book` active.
export function bookLibrary(): ProjectsLibrary {
  return buildProjectsLibrary({ settings: ACTIVE_BOOK_SETTINGS });
}

// The URL of a project-scoped route, with its query. The :projectId of the template is replaced.
export function fileUrl(
  template: string,
  projectId: string,
  query: Record<string, string> = {},
): string {
  const path = template.replace(':projectId', projectId);
  const search = new URLSearchParams(query).toString();
  return search === '' ? path : `${path}?${search}`;
}

// The sha256 hash of bytes, in the contract's form: sha256: and the lower-case hex digest.
export function sha256Of(bytes: string | Buffer): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

// True for an ISO 8601 UTC timestamp with Z, the form of every mtime.
export function isUtcTimestamp(text: string): boolean {
  return /Z$/.test(text) && new Date(text).toISOString() === text;
}

// Writes bytes at a library-relative path (for example book/sources/a.md), making the folders above it.
export function putFile(
  library: string,
  relativePath: string,
  bytes: string | Buffer,
): void {
  const target = join(library, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

// One GET of the list route, with the loopback Host and the session cookie.
export function listFiles(
  app: TestApp,
  cookie: string,
  projectId: string,
  path: string,
  recursive = false,
): Promise<Reply> {
  const query: Record<string, string> = { path };
  if (recursive) query.recursive = 'true';
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: fileUrl(PROJECT_FILES_ROUTE, projectId, query),
  });
}

// One GET of the read route, with the loopback Host and the session cookie.
export function readFile(
  app: TestApp,
  cookie: string,
  projectId: string,
  path: string,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: fileUrl(PROJECT_FILE_ROUTE, projectId, { path }),
  });
}

// One POST of the write route.
export function writeFile(
  app: TestApp,
  cookie: string,
  projectId: string,
  body: FileWrite,
): Promise<Reply> {
  return postJson(
    app,
    cookie,
    fileUrl(PROJECT_FILE_WRITE_ROUTE, projectId),
    body,
  );
}

// One POST of the edit route.
export function editFile(
  app: TestApp,
  cookie: string,
  projectId: string,
  body: FileEdit,
): Promise<Reply> {
  return postJson(
    app,
    cookie,
    fileUrl(PROJECT_FILE_EDIT_ROUTE, projectId),
    body,
  );
}

// The entry paths of a list answer, in the order the answer gives them.
export function entryPaths(reply: Reply): string[] {
  return (JSON.parse(reply.body) as FileList).entries.map(
    (entry) => entry.path,
  );
}

// A test module that calls the in-process provider with the request body unchecked (P18). It has no guard, as
// activeKitModule has none. Its routes sit under api/project-store-test, not under the API's routes.
// fill-write builds its content on the server: a body of 5 MiB cannot be sent over HTTP (100 KB limit).
export function filesKitModule(): Type<unknown> {
  @Controller('api/project-store-test')
  class FilesKitController {
    constructor(private readonly files: FilesService) {}

    @Post('files/list')
    @HttpCode(200)
    list(
      @Body()
      body: {
        projectId: string;
        path: string;
        recursive?: boolean;
      },
    ): FileList {
      return this.files.list(body.projectId, {
        path: body.path,
        recursive: body.recursive,
      });
    }

    @Post('files/read')
    @HttpCode(200)
    read(@Body() body: { projectId: string; path: string }): unknown {
      return this.files.read(body.projectId, body.path);
    }

    @Post('files/write')
    @HttpCode(200)
    write(@Body() body: FileWrite & { projectId: string }): unknown {
      return this.files.write(body.projectId, {
        path: body.path,
        content: body.content,
        baseHash: body.baseHash,
      });
    }

    @Post('files/edit')
    @HttpCode(200)
    edit(@Body() body: FileEdit & { projectId: string }): unknown {
      return this.files.edit(body.projectId, {
        path: body.path,
        old: body.old,
        new: body.new,
      });
    }

    @Post('files/fill-write')
    @HttpCode(200)
    fillWrite(
      @Body() body: { projectId: string; path: string; bytes: number },
    ): unknown {
      return this.files.write(body.projectId, {
        path: body.path,
        content: 'a'.repeat(body.bytes),
      });
    }
  }

  @Module({
    imports: [PlatformModule, ProjectStoreModule],
    controllers: [FilesKitController],
  })
  class FilesKitModule {}

  return FilesKitModule;
}
