import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Body, Controller, HttpCode, Module, Post } from '@nestjs/common';
import {
  ProjectStoreModule,
  ProjectStoreService,
} from '../src/modules/project-store/project-store.module';
import type { TestApp } from './create-test-app';

export const RESOLVE_TEST_PATH = '/api/project-store-test/resolve';

export interface PathSafetyLibrary {
  library: string; // the temp library L
  outside: string; // a temp folder outside L
  remove: () => void; // removes L and O
}

// The temp library L with the project book, a folder O outside L, and the links of section 4b.
export function buildPathSafetyLibrary(): PathSafetyLibrary {
  const library = mkdtempSync(join(tmpdir(), 'scriba-path-library-'));
  const outside = mkdtempSync(join(tmpdir(), 'scriba-path-outside-'));
  const remove = (): void => {
    rmSync(library, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  };
  try {
    const book = join(library, 'book');
    const file = (path: string, text: string): void => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    };
    file(join(book, 'drafts', 'ch01.md'), '# Chapter one\n');
    file(
      join(book, 'drafts', '.versions', 'ch01.md', '20261104T231500123Z.md'),
      '# Chapter one, before\n',
    );
    file(join(book, 'sources', 'note.md'), 'A note.\n');
    file(join(book, '.scriba', 'pending', 'a.json'), '{}\n');
    file(join(library, 'other-book', 'secret.md'), 'Another book.\n');
    file(join(outside, 'secret.txt'), 'Outside the library.\n');

    const link = (target: string, path: string): void =>
      symlinkSync(target, path);
    link('sources', join(book, 'link-within'));
    link('sources/note.md', join(book, 'link-within-file'));
    link('.', join(book, 'link-to-root'));
    link('.scriba', join(book, 'link-to-scriba'));
    link('drafts/.versions', join(book, 'link-to-versions'));
    link(join(library, 'other-book'), join(book, 'link-out'));
    link(join(library, 'other-book', 'secret.md'), join(book, 'link-out-file'));
    link('..', join(book, 'link-up'));
    link(outside, join(book, 'link-outside'));
    link('link-out', join(book, 'link-chain'));
    link('../../other-book', join(book, 'sources', 'ext'));
    link('nowhere.md', join(book, 'dangling'));
    link('loop-b', join(book, 'loop-a'));
    link('loop-a', join(book, 'loop-b'));
    link('book', join(library, 'alias'));
  } catch (error) {
    remove();
    throw error;
  }
  return { library, outside, remove };
}

export type ResolveOutcome =
  'invalid' | 'outside' | 'reserved' | 'not-found' | 'allowed';

// One request to the test route and what it must answer.
export interface ResolveCase {
  name: string;
  project: string; // joined to the library root by the test route
  path: unknown; // sent as it is; row 15 is a number
  outcome: ResolveOutcome;
  basis: string; // 'criterion (...)', 'extra (...)' or 'control'
  relativePath?: string; // allowed rows; default: the path itself
  exists?: boolean; // allowed rows
  isRoot?: boolean; // allowed rows; default false
}

type CaseInput = Omit<ResolveCase, 'name'>;

const BOOK = 'book';

function invalid(path: unknown, basis: string): CaseInput {
  return { project: BOOK, path, outcome: 'invalid', basis };
}

function outside(path: unknown, basis: string): CaseInput {
  return { project: BOOK, path, outcome: 'outside', basis };
}

function reserved(path: unknown, basis: string): CaseInput {
  return { project: BOOK, path, outcome: 'reserved', basis };
}

function allowed(
  path: unknown,
  basis: string,
  exists: boolean,
  shape: { relativePath?: string; isRoot?: boolean } = {},
): CaseInput {
  return { project: BOOK, path, outcome: 'allowed', basis, exists, ...shape };
}

// The 56 rows of section 4b, numbered in order. Row 6 and the NUL, backslash and long rows use the escapes of the plan.
export function pathSafetyCases(fixture: PathSafetyLibrary): ResolveCase[] {
  const rows: CaseInput[] = [
    invalid('../other-book/secret.md', 'criterion (..)'),
    invalid('drafts/..', 'criterion (..)'),
    invalid('..', 'criterion (..)'),
    invalid('./../x', 'criterion (..)'),
    invalid('/etc/passwd', 'criterion (absolute)'),
    invalid(
      join(fixture.library, 'book/drafts/ch01.md'),
      'criterion (absolute)',
    ),
    invalid('/', 'criterion (absolute)'),
    invalid('drafts\\ch01.md', 'criterion (backslash)'),
    invalid('..\\other-book', 'criterion (backslash)'),
    invalid('drafts/ch01.md\u0000.png', 'criterion (NUL)'),
    invalid('a\u0000', 'criterion (NUL)'),
    invalid('drafts//ch01.md', 'criterion (empty segment)'),
    invalid('drafts/', 'criterion (empty segment, trailing)'),
    invalid('', 'criterion (empty segment; P4)'),
    invalid(5, 'extra (section 1c step 1: not a string)'),
    invalid(`drafts/${'a'.repeat(300)}`, 'extra (P10: ENAMETOOLONG)'),
    outside('link-out', 'criterion (symlink out)'),
    outside('link-out/secret.md', 'criterion (symlink out)'),
    outside('link-out-file', 'criterion (symlink out)'),
    outside(
      'link-out/new/file.md',
      'criterion (symlink out; a missing target under it)',
    ),
    outside('link-up/other-book/secret.md', 'criterion (symlink out)'),
    outside('link-outside/secret.txt', 'criterion (symlink out)'),
    outside(
      'link-chain/secret.md',
      'criterion (symlink out, through a link to a link)',
    ),
    outside('sources/ext/secret.md', 'criterion (symlink out, nested)'),
    outside(
      'link-up/book/drafts/ch01.md',
      'criterion (symlink out; the path comes back into the project, P8)',
    ),
    outside('dangling', 'extra (P8)'),
    outside('loop-a', 'extra (P8)'),
    reserved('.scriba/pending/a.json', 'criterion (.scriba/...)'),
    reserved(
      '.scriba/not-yet/x.json',
      'criterion (.scriba/...; need not exist, P5)',
    ),
    reserved('.scriba', 'extra (P7: the folder itself)'),
    reserved(
      'drafts/.versions/ch01.md/20261104T231500123Z.md',
      'criterion (drafts/.versions/...)',
    ),
    reserved('drafts/.versions', 'extra (P7: the folder itself)'),
    reserved('./.scriba/pending/a.json', 'extra (P4)'),
    reserved('drafts/./.versions/x', 'extra (P4)'),
    reserved('.SCRIBA/pending/a.json', 'extra (P6)'),
    reserved('Drafts/.Versions/x', 'extra (P6)'),
    reserved('link-to-scriba/pending/a.json', 'extra (P5)'),
    reserved('link-to-versions/ch01.md', 'extra (P5)'),
    reserved('link-to-root/.scriba/pending/a.json', 'extra (P5)'),
    allowed('drafts/ch01.md', 'control', true),
    allowed('sources', 'control', true),
    allowed('.', 'extra (P4)', true, { relativePath: '', isRoot: true }),
    allowed('./drafts/ch01.md', 'extra (P4)', true, {
      relativePath: 'drafts/ch01.md',
    }),
    allowed('link-within/note.md', 'criterion (symlink within)', true),
    allowed('link-within-file', 'criterion (symlink within, to a file)', true),
    allowed(
      'link-to-root/drafts/ch01.md',
      'criterion (symlink within, to the root)',
      true,
    ),
    allowed(
      'link-within/new/chapter.md',
      'criterion (symlink within; a not-yet-existing nested target)',
      false,
    ),
    allowed(
      'drafts/new/deep/chapter.md',
      'criterion (a not-yet-existing nested target under a valid ancestor)',
      false,
    ),
    allowed('drafts/./ch01.md', 'extra (P4)', true, {
      relativePath: 'drafts/ch01.md',
    }),
    allowed('brand-new.md', 'control', false),
    allowed('drafts/ch01.md/child.md', 'extra (P9)', false),
    allowed('a..b/c.md', 'extra (P4: a..b is not a .. segment)', false),
    allowed('.notes/x.md', 'extra (P7: other dot-folders)', false),
    allowed('.scribe/x.md', 'extra (P7)', false),
    allowed('drafts/.versions-old/x.md', 'extra (P7)', false),
    allowed('sub/.scriba/x.md', 'extra (P7: not at the project root)', false),
  ];
  return rows.map((row, index) => ({ name: `row ${index + 1}`, ...row }));
}

export interface Reply {
  status: number;
  text: string;
}

// One POST of a JSON body to the test route. The route passes `path` on unchanged.
export async function postResolve(
  app: TestApp,
  body: { project: string; path: unknown },
): Promise<Reply> {
  const response = await fetch(app.baseUrl + RESOLVE_TEST_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// A test-only route. It is not in COMPOSED_MODULES, so the composed app and the invariant sweeps never see it.
// It returns only relativePath, isRoot and exists; realPath never reaches a response.
@Controller('api/project-store-test')
class PathSafetyKitController {
  constructor(private readonly store: ProjectStoreService) {}

  @Post('resolve')
  @HttpCode(200)
  resolve(@Body() body: { project: string; path: unknown }) {
    const root = join(this.store.libraryRoot, body.project);
    // No validation here: a non-string path reaches the function's own check.
    const { relativePath, isRoot, exists } = this.store.resolvePath(
      root,
      body.path as string,
    );
    return { relativePath, isRoot, exists };
  }
}

@Module({
  imports: [ProjectStoreModule],
  controllers: [PathSafetyKitController],
})
export class PathSafetyKitModule {}
