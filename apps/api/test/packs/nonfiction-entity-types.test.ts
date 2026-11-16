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

it('AC1: person, claim and concept lint clean, load, and their reference fields name kind source', async () => {
  // (i) No lint finding of the three files, error or warning (D8).
  const findings = lintPacks(PACKS_ROOT).filter((finding) =>
    finding.file.startsWith('nonfiction/entity-types/'),
  );
  expect(findings).toEqual([]);

  // (ii) The app boots on the real packs root (a fault in one of the files stops boot, D9).
  await withRealPacks(async (app) => {
    // (iii) The registry's own list route answers with the three kinds, in their folders.
    const list = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: ENTITY_TYPES_ROUTE,
    });
    expect(list.status).toBe(200);
    const types = entityTypeListSchema.parse(json(list)).entityTypes;
    expect(types).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'person', folder: 'entities' }),
        expect.objectContaining({ kind: 'claim', folder: 'entities' }),
        expect.objectContaining({ kind: 'concept', folder: 'entities' }),
      ]),
    );

    // (iv) The reference fields carry the hints of kind source (D11).
    const person = types.find((type) => type.kind === 'person');
    expect(person?.fields).toMatchObject({
      properties: {
        sources: {
          'x-scriba-type': 'entity',
          'x-scriba-entity-kinds': ['source'],
        },
      },
    });
    const claim = types.find((type) => type.kind === 'claim');
    expect(claim?.fields).toMatchObject({
      properties: {
        evidence: {
          'x-scriba-type': 'entity',
          'x-scriba-entity-kinds': ['source'],
        },
      },
    });

    // (v) The kind that the hints name is a loaded kind (D11).
    expect(types).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'source' })]),
    );
  });
});

it('AC2: the per-kind validators accept valid fixtures and reject a claim with status unsourced', async () => {
  await withRealPacks(async (app) => {
    // A person with name, role and one source reference is valid.
    const person = await kitPost(app, {
      kind: 'person',
      frontMatter: {
        name: 'Anders Ericsson',
        role: 'Researcher of expert performance',
        sources: ['ten-thousand-hours-notes'],
      },
    });
    expect(person.status).toBe(200);
    expect(json(person)).toMatchObject({ valid: true });

    // A concept with name and definition is valid.
    const concept = await kitPost(app, {
      kind: 'concept',
      frontMatter: {
        name: 'Deliberate practice',
        definition: 'Practice aimed at a specific skill, with feedback.',
      },
    });
    expect(json(concept)).toMatchObject({ valid: true });

    // A claim is valid with each of the three verdict statuses.
    for (const status of ['supported', 'weak', 'unsupported']) {
      const claim = await kitPost(app, {
        kind: 'claim',
        frontMatter: {
          statement: 'Deliberate practice drives expert performance.',
          evidence: ['deliberate-practice-notes'],
          status,
        },
      });
      expect(json(claim)).toMatchObject({ valid: true });
    }

    // A claim with status unsourced is invalid, at /status.
    const unsourced = await kitPost(app, {
      kind: 'claim',
      frontMatter: {
        statement: 'Deliberate practice drives expert performance.',
        evidence: ['deliberate-practice-notes'],
        status: 'unsourced',
      },
    });
    expect(json(unsourced)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: '/status' }),
      ]),
    });
  });
});
