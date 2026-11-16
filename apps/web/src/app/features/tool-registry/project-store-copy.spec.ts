import {
  ACTIVE_PROJECT_ROUTE,
  activeProjectSchema,
  ENTITY_ID_PATTERN as CONTRACT_ENTITY_ID_PATTERN,
  entityListSchema,
  entityResolutionSchema,
  fileReadSchema,
  PROJECT_ENTITIES_ROUTE,
  PROJECT_ENTITY_RESOLVE_ROUTE,
  PROJECT_FILE_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { ENTITY_KIND_PATTERN } from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  ENTITY_ID_PATTERN,
  entityListCopy,
  entityResolutionCopy,
  entityResolvePath,
  fileReadCopy,
  PROJECT_ENTITIES_TEMPLATE,
  PROJECT_ENTITY_RESOLVE_TEMPLATE,
  PROJECT_FILE_TEMPLATE,
  projectEntitiesPath,
  projectFilePath,
  STYLE_PROFILE_KIND,
  styleProfileOf,
} from './project-store-copy';

const HASH = `sha256:${'a'.repeat(64)}`;

const acceptedActive: unknown[] = [{ active: 'p1' }, { active: null }];

const refusedActive: unknown[] = [{ active: '' }, { active: 3 }, {}];

const acceptedEntityLists: unknown[] = [
  { entities: [], invalid: [] },
  {
    entities: [
      { id: 'ada', type: 'person', path: 'entities/ada.md', title: 'Ada' },
      { id: 'house-style', type: 'style-profile', path: 'styles/house.md' },
    ],
    invalid: [{ path: 'entities/broken.md', reason: 'Not YAML.' }],
  },
];

const refusedEntityLists: unknown[] = [
  { entities: [] },
  {
    entities: [{ id: 'Ada', type: 'person', path: 'entities/ada.md' }],
    invalid: [],
  },
];

const acceptedFileReads: unknown[] = [
  {
    path: 'project.yaml',
    content: 'title: Book\n',
    hash: HASH,
    mtime: '2026-11-15T10:00:00Z',
  },
  {
    path: 'project.yaml',
    content: '',
    hash: HASH,
    mtime: '2026-11-15T10:00:00.123Z',
    upgraded: true,
  },
];

const refusedFileReads: unknown[] = [
  {
    path: 'project.yaml',
    content: '',
    hash: 'sha256:ABC',
    mtime: '2026-11-15T10:00:00Z',
  },
  {
    path: 'project.yaml',
    content: '',
    hash: HASH,
    mtime: '2026-11-15 10:00:00',
  },
];

describe('project-store copies', () => {
  it('the route paths agree with the contract', () => {
    expect(ACTIVE_PROJECT_PATH).toBe(ACTIVE_PROJECT_ROUTE);
    expect(PROJECT_ENTITIES_TEMPLATE).toBe(PROJECT_ENTITIES_ROUTE);
    expect(PROJECT_FILE_TEMPLATE).toBe(PROJECT_FILE_ROUTE);
    expect(projectEntitiesPath('p1')).toBe(
      PROJECT_ENTITIES_ROUTE.replace(':projectId', 'p1'),
    );
    expect(projectFilePath('p1')).toBe(
      PROJECT_FILE_ROUTE.replace(':projectId', 'p1'),
    );
    expect(projectFilePath('a b/c')).toBe(
      '/api/project-store/projects/a%20b%2Fc/file',
    );
  });

  it('the active answer agrees with activeProjectSchema', () => {
    for (const sample of acceptedActive) {
      expect(activeProjectSchema.safeParse(sample).success).toBe(true);
      expect(activeCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedActive) {
      expect(activeProjectSchema.safeParse(sample).success).toBe(false);
      expect(activeCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the entity list answer agrees with entityListSchema', () => {
    for (const sample of acceptedEntityLists) {
      expect(entityListSchema.safeParse(sample).success).toBe(true);
      expect(entityListCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedEntityLists) {
      expect(entityListSchema.safeParse(sample).success).toBe(false);
      expect(entityListCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the file read answer agrees with fileReadSchema', () => {
    for (const sample of acceptedFileReads) {
      expect(fileReadSchema.safeParse(sample).success).toBe(true);
      expect(fileReadCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedFileReads) {
      expect(fileReadSchema.safeParse(sample).success).toBe(false);
      expect(fileReadCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the entity ID pattern and the style kind agree with the contract', () => {
    expect(ENTITY_ID_PATTERN.source).toBe(CONTRACT_ENTITY_ID_PATTERN.source);
    expect(STYLE_PROFILE_KIND).toBe('style-profile');
    expect(ENTITY_KIND_PATTERN.test(STYLE_PROFILE_KIND)).toBe(true);
  });
});

describe('styleProfileOf', () => {
  it('reads a bare id, a quoted id and an id with a trailing comment', () => {
    expect(styleProfileOf('title: Book\nstyleProfile: house-style\n')).toBe(
      'house-style',
    );
    expect(styleProfileOf('styleProfile: "house-style"\n')).toBe('house-style');
    expect(styleProfileOf("styleProfile: 'house-style'\n")).toBe('house-style');
    expect(styleProfileOf('styleProfile: house-style # the house\n')).toBe(
      'house-style',
    );
  });

  it('reads nothing from an indented key, a missing key or a value that fails the pattern', () => {
    expect(styleProfileOf('  styleProfile: house-style\n')).toBeUndefined();
    expect(styleProfileOf('title: Book\n')).toBeUndefined();
    expect(styleProfileOf('styleProfile: House Style\n')).toBeUndefined();
  });

  it('takes the first matching line, and accepts CRLF line ends', () => {
    expect(
      styleProfileOf('styleProfile: plain\nstyleProfile: house-style\n'),
    ).toBe('plain');
    expect(styleProfileOf('styleProfile: House\nstyleProfile: second\n')).toBe(
      'second',
    );
    expect(styleProfileOf('title: Book\r\nstyleProfile: plain\r\n')).toBe(
      'plain',
    );
  });
});

describe('project-store resolution copies', () => {
  // R1: the resolution path and answer agree with the contract.
  it('R1 entityResolvePath and entityResolutionCopy agree with the contract', () => {
    expect(PROJECT_ENTITY_RESOLVE_TEMPLATE).toBe(PROJECT_ENTITY_RESOLVE_ROUTE);
    expect(entityResolvePath('p1', ['a', 'b'])).toBe(
      `${PROJECT_ENTITY_RESOLVE_ROUTE.replace(':projectId', 'p1')}?ids=a&ids=b`,
    );
    expect(entityResolvePath('a b/c', ['x'])).toBe(
      '/api/project-store/projects/a%20b%2Fc/entities/resolve?ids=x',
    );
    const accepted = {
      resolved: [
        { id: 'ada', type: 'person', path: 'entities/ada.md', content: 'Ada.' },
      ],
      errors: [{ id: 'bob', code: 'unknown' }],
    };
    const refused = { resolved: [], errors: [{ id: 'bob', code: 'other' }] };
    expect(entityResolutionSchema.safeParse(accepted).success).toBe(true);
    expect(entityResolutionCopy.safeParse(accepted).success).toBe(true);
    expect(entityResolutionSchema.safeParse(refused).success).toBe(false);
    expect(entityResolutionCopy.safeParse(refused).success).toBe(false);
  });
});
