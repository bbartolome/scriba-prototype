import { resolve } from 'node:path';
import {
  Body,
  Controller,
  HttpCode,
  Module,
  NotFoundException,
  Post,
  type Type,
} from '@nestjs/common';
import { expect, it } from 'vitest';
import {
  ENTITY_TYPES_ROUTE,
  entityTypeListSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { PlatformModule } from '../../src/modules/platform/platform.module';
import { lintPacks } from '../../src/modules/tool-registry/pack-lint';
import {
  CatalogService,
  ToolRegistryModule,
} from '../../src/modules/tool-registry/tool-registry.module';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, type Reply } from '../guard-request';
import { LOOPBACK_HOST } from '../invariant-sweep';

// The real packs root: this file sits in apps/api/test/packs, so the root is four levels up.
const PACKS_ROOT = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'packs',
);
const KIT = '/api/tool-registry-test';

// The test kit: one route over CatalogService, with no guard. It answers the per-kind validator's result.
function validatorKitModule(): Type<unknown> {
  @Controller('api/tool-registry-test')
  class ValidatorKitController {
    constructor(private readonly catalog: CatalogService) {}

    @Post('entity-validate')
    @HttpCode(200)
    entityValidate(@Body() body: { kind: string; frontMatter: unknown }) {
      const check = this.catalog.entityValidator(body.kind);
      if (check === undefined) {
        throw new NotFoundException(`No entity type "${body.kind}".`);
      }
      return check(body.frontMatter);
    }
  }

  @Module({
    imports: [ToolRegistryModule],
    controllers: [ValidatorKitController],
  })
  class ValidatorKitModule {}

  return ValidatorKitModule;
}

// Boots the platform, the registry and the kit on the real packs root. The temp library is removed on close.
async function withRealPacks(
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    modules: [PlatformModule, ToolRegistryModule, validatorKitModule()],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

function kitPost(app: TestApp, body: unknown): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    method: 'POST',
    path: `${KIT}/entity-validate`,
    body: JSON.stringify(body),
  });
}

function json(reply: Reply): unknown {
  return JSON.parse(reply.body);
}

it('AC1: source and style-profile lint clean and load in the entity-types list', async () => {
  // (i) No lint finding of either file, error or warning (D10).
  const findings = lintPacks(PACKS_ROOT).filter((finding) =>
    finding.file.startsWith('core/entity-types/'),
  );
  expect(findings).toEqual([]);

  // (ii) The app boots on the real packs root (a fault in either file stops boot, D11).
  await withRealPacks(async (app) => {
    // (iii) The registry's own list route answers with both kinds, in their folders.
    const list = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: ENTITY_TYPES_ROUTE,
    });
    expect(list.status).toBe(200);
    const types = entityTypeListSchema.parse(json(list)).entityTypes;
    expect(types).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'source', folder: 'sources' }),
        expect.objectContaining({ kind: 'style-profile', folder: 'entities' }),
      ]),
    );
  });
});

it('AC2: the per-kind validators accept valid fixtures and reject a missing citation and a non-list bannedPhrases', async () => {
  await withRealPacks(async (app) => {
    // A source with the four fields is valid, with or without url.
    const source = {
      type: 'source',
      title: 'Deliberate practice notes',
      citation: 'Ericsson, K. A. (1993). The role of deliberate practice.',
      reliability: 'Peer-reviewed; high.',
    };
    const validSource = await kitPost(app, {
      kind: 'source',
      frontMatter: source,
    });
    expect(validSource.status).toBe(200);
    expect(json(validSource)).toMatchObject({ valid: true });

    const validSourceWithUrl = await kitPost(app, {
      kind: 'source',
      frontMatter: { ...source, url: 'https://example.org/notes' },
    });
    expect(json(validSourceWithUrl)).toMatchObject({ valid: true });

    // A source without citation is invalid, at the root, with a message that names the field.
    const noCitation = await kitPost(app, {
      kind: 'source',
      frontMatter: { type: 'source', title: 'Notes', reliability: 'Unknown.' },
    });
    expect(json(noCitation)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: '',
          message: expect.stringContaining('citation'),
        }),
      ]),
    });

    // A style-profile with a list of banned phrases is valid.
    const profile = {
      type: 'style-profile',
      tone: 'Plain and direct.',
      targetLength: 800,
      bannedPhrases: ['game-changer'],
    };
    const validProfile = await kitPost(app, {
      kind: 'style-profile',
      frontMatter: profile,
    });
    expect(json(validProfile)).toMatchObject({ valid: true });

    // A style-profile whose bannedPhrases is a string is invalid, at /bannedPhrases. The message is Ajv's text,
    // so only the path is asserted (issueOf, entity-types.ts line 292).
    const stringPhrases = await kitPost(app, {
      kind: 'style-profile',
      frontMatter: { ...profile, bannedPhrases: 'game-changer' },
    });
    expect(json(stringPhrases)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: '/bannedPhrases' }),
      ]),
    });
  });
});
