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

// The served `fields` of an entity type, read as the parts this test asserts on.
type ServedSchema = {
  properties?: Record<
    string,
    {
      'x-scriba-entity-kinds'?: unknown[];
      items?: {
        properties?: Record<string, { 'x-scriba-entity-kinds'?: unknown[] }>;
      };
    }
  >;
};

function served(type: { fields: unknown } | undefined): ServedSchema {
  return (type?.fields ?? {}) as ServedSchema;
}

it('AC1: character, place and world-rule lint clean, load, and their reference fields name shipped kinds', async () => {
  // (i) No lint finding of the three files, error or warning (D8).
  const findings = lintPacks(PACKS_ROOT).filter((finding) =>
    finding.file.startsWith('fiction/entity-types/'),
  );
  expect(findings).toEqual([]);

  // (ii) The app boots on the real packs root (a fault in one of the files stops boot, D10).
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
        expect.objectContaining({ kind: 'character', folder: 'entities' }),
        expect.objectContaining({ kind: 'place', folder: 'entities' }),
        expect.objectContaining({ kind: 'world-rule', folder: 'entities' }),
      ]),
    );

    // (iv) Each kind has exactly the fields of D2, all required (D3, D9).
    const character = types.find((type) => type.kind === 'character');
    expect(character?.fields).toMatchObject({
      type: 'object',
      required: ['name', 'want', 'need', 'flaw', 'voice', 'relationships'],
    });
    expect(Object.keys(character?.fields.properties ?? {}).sort()).toEqual([
      'flaw',
      'name',
      'need',
      'relationships',
      'voice',
      'want',
    ]);
    // The one-level list of objects, and its character reference (D4, D5).
    expect(character?.fields).toMatchObject({
      properties: {
        relationships: {
          items: {
            additionalProperties: false,
            required: ['character', 'note'],
            properties: {
              character: {
                'x-scriba-type': 'entity',
                'x-scriba-entity-kinds': ['character'],
              },
            },
          },
        },
      },
    });

    const place = types.find((type) => type.kind === 'place');
    expect(place?.fields).toMatchObject({
      type: 'object',
      required: ['name', 'rules'],
    });
    expect(Object.keys(place?.fields.properties ?? {}).sort()).toEqual([
      'name',
      'rules',
    ]);
    expect(place?.fields).toMatchObject({
      properties: {
        rules: {
          'x-scriba-type': 'entity',
          'x-scriba-entity-kinds': ['world-rule'],
        },
      },
    });

    const worldRule = types.find((type) => type.kind === 'world-rule');
    expect(worldRule?.fields).toMatchObject({
      type: 'object',
      required: ['statement', 'appliesTo'],
    });
    expect(Object.keys(worldRule?.fields.properties ?? {}).sort()).toEqual([
      'appliesTo',
      'statement',
    ]);
    expect(worldRule?.fields).toMatchObject({
      properties: {
        appliesTo: {
          'x-scriba-type': 'entity',
          'x-scriba-entity-kinds': ['place'],
        },
      },
    });

    // (v) The kinds that the served reference hints name are shipped kinds (D4).
    // The test collects them from the served entries, not from a fixed list.
    const referenceFields = [
      served(character).properties?.relationships?.items?.properties?.character,
      served(place).properties?.rules,
      served(worldRule).properties?.appliesTo,
    ];
    const referenceKinds = referenceFields.flatMap(
      (field) => field?.['x-scriba-entity-kinds'] ?? [],
    );
    const shipped = types.map((type) => type.kind);
    for (const kind of referenceKinds) {
      expect(shipped).toContain(kind);
    }
    expect([...new Set(referenceKinds)].sort()).toEqual([
      'character',
      'place',
      'world-rule',
    ]);
  });
});

it('AC2: the per-kind validators accept valid fixtures and reject a relationship missing note', async () => {
  await withRealPacks(async (app) => {
    // A character with name, want, need, flaw, voice and one relationship is valid.
    const character = await kitPost(app, {
      kind: 'character',
      frontMatter: {
        name: 'Ines Carrow',
        want: 'To leave the island before winter.',
        need: 'To accept help from the people she has avoided.',
        flaw: 'She keeps every debt to herself.',
        voice: 'Short sentences, dry humour.',
        relationships: [
          {
            character: 'tomas-reyes',
            note: 'Her relief keeper; she trusts him slowly.',
          },
        ],
      },
    });
    expect(character.status).toBe(200);
    expect(json(character)).toMatchObject({ valid: true });

    // A character with an empty relationships list is valid (D3; no minItems, open point 2).
    const alone = await kitPost(app, {
      kind: 'character',
      frontMatter: {
        name: 'Ines Carrow',
        want: 'To leave the island before winter.',
        need: 'To accept help from the people she has avoided.',
        flaw: 'She keeps every debt to herself.',
        voice: 'Short sentences, dry humour.',
        relationships: [],
      },
    });
    expect(json(alone)).toMatchObject({ valid: true });

    // A place with name and rules is valid.
    const place = await kitPost(app, {
      kind: 'place',
      frontMatter: {
        name: 'Skerry Light',
        rules: ['spring-tide-only'],
      },
    });
    expect(json(place)).toMatchObject({ valid: true });

    // A world-rule with statement and appliesTo is valid.
    const worldRule = await kitPost(app, {
      kind: 'world-rule',
      frontMatter: {
        statement: 'The supply boat comes only on a spring tide.',
        appliesTo: ['skerry-light'],
      },
    });
    expect(json(worldRule)).toMatchObject({ valid: true });

    // A relationship without note is invalid, at /relationships/0. The note is the only change.
    const noNote = await kitPost(app, {
      kind: 'character',
      frontMatter: {
        name: 'Ines Carrow',
        want: 'To leave the island before winter.',
        need: 'To accept help from the people she has avoided.',
        flaw: 'She keeps every debt to herself.',
        voice: 'Short sentences, dry humour.',
        relationships: [{ character: 'tomas-reyes' }],
      },
    });
    expect(json(noNote)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: '/relationships/0' }),
      ]),
    });

    // A relationship with an extra key is invalid, at /relationships/0 (D5).
    const extraKey = await kitPost(app, {
      kind: 'character',
      frontMatter: {
        name: 'Ines Carrow',
        want: 'To leave the island before winter.',
        need: 'To accept help from the people she has avoided.',
        flaw: 'She keeps every debt to herself.',
        voice: 'Short sentences, dry humour.',
        relationships: [
          {
            character: 'tomas-reyes',
            note: 'Her relief keeper; she trusts him slowly.',
            weight: 2,
          },
        ],
      },
    });
    expect(json(extraKey)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: '/relationships/0' }),
      ]),
    });
  });
});
