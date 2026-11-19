import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  PREFLIGHT_ROUTE,
  preflightResultSchema,
} from '@bbartolome/scriba-contracts/compile-export';
import { type TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { withManuscript } from './compile-export-manuscript.kit';
import { putFile } from './project-store-files.kit';

// One POST of the preflight route, with the loopback Host, the loopback Origin, the session cookie and no body.
function postPreflight(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    method: 'POST',
    path: PREFLIGHT_ROUTE,
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
  });
}

const UNKNOWN = 'Entity reference names no entity.';
const DUPLICATE = 'Entity reference names more than one entity.';
const MISSING = 'Link or image names no file in the project.';
const REFUSED = 'Link or image does not name a file inside the project.';

// E1: the fixture of criterion 1. Keys are project-relative to the book project. ch01.md is the file under test.
const CH01 = [
  '---',
  'title: One',
  'links: [ada, ghost]',
  '---',
  '# One',
  '',
  'Ada wrote it [@ada].',
  'Nobody knows [@ghost].',
  'Two of them [@ada; @nobody].',
  'Duplicate [@bob].',
  '![Cover](assets/cover.png)',
  '![Map](assets/missing.png)',
  'See [the notes](../outside.md).',
  '[ref]: assets/gone.png',
  'Use [ref].',
  '![Again](<assets/cover.png>)',
  '![Spaced](assets/my%20map.png)',
  'A note.[^1]',
  'Code link [x](`assets/none.png`).',
  '[^1]: The note.',
  '',
].join('\n');

const E1_FILES: Record<string, string> = {
  'entities/ada.md': ['---', 'type: person', '---', 'Ada Lovelace.', ''].join(
    '\n',
  ),
  'entities/bob.md': ['---', 'type: person', '---', 'Bob.', ''].join('\n'),
  'sources/bob.md': "Bob's notes.\n",
  'assets/cover.png': 'cover',
  'assets/my map.png': 'map',
  'drafts/ch01.md': CH01,
};

it('entity links: unknown, duplicate and outside references, a bad links entry and a missing image are errors at their lines', async () => {
  await withManuscript(E1_FILES, async (app, cookie) => {
    const reply = await postPreflight(app, cookie);
    expect(reply.status).toBe(200);
    const result = preflightResultSchema.parse(JSON.parse(reply.body));
    const check = result.checks.find((item) => item.id === 'entity-links');
    expect(check?.status).toBe('fail');

    const findings = check?.findings ?? [];
    expect(findings.every((finding) => finding.severity === 'error')).toBe(
      true,
    );
    expect(
      findings.map((finding) => [
        finding.path,
        finding.line,
        CH01.slice(
          finding.offset ?? -1,
          (finding.offset ?? 0) + (finding.length ?? 0),
        ),
        finding.message,
      ]),
    ).toEqual([
      ['drafts/ch01.md', 3, 'ghost', UNKNOWN],
      ['drafts/ch01.md', 8, '@ghost', UNKNOWN],
      ['drafts/ch01.md', 9, '@nobody', UNKNOWN],
      ['drafts/ch01.md', 10, '@bob', DUPLICATE],
      ['drafts/ch01.md', 12, 'assets/missing.png', MISSING],
      ['drafts/ch01.md', 13, '../outside.md', REFUSED],
      ['drafts/ch01.md', 14, 'assets/gone.png', MISSING],
    ]);
  });
});

const BANNED_MESSAGE = 'Banned phrase left in the text.';
const NO_PROFILE =
  'No style profile is set in project.yaml, so banned phrases were not checked.';
const UNUSABLE =
  'The style profile gives no usable bannedPhrases list, so banned phrases were not checked.';

// B1: the fixture of criterion 2. drafts/a.md has the split phrase in prose, and the phrases in code (lines 9, 11 to 13).
const A_MD = [
  '# Chapter one',
  '',
  'This is a game',
  'changer, the editor said.',
  '',
  'Game Changer again.',
  'You can unlock your potential.',
  '',
  'Inline `game changer` is code. Game changers and changer alone are not the phrase.',
  '',
  '```text',
  'unlock your potential',
  '```',
  '',
].join('\n');

const DEFAULT_PROJECT =
  'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n';
const HOUSE_PROJECT = `${DEFAULT_PROJECT}styleProfile: house-style\n`;
const GHOST_PROJECT = `${DEFAULT_PROJECT}styleProfile: ghost\n`;
const HOUSE_STYLE = [
  '---',
  'type: style-profile',
  'tone: Plain and direct',
  'targetLength: 800',
  'bannedPhrases: [game changer, unlock your potential]',
  '---',
  'Say what the evidence shows.',
  '',
].join('\n');

it('banned phrases: a split phrase is found, code is not scanned, and no style profile is an info pass', async () => {
  await withManuscript(
    { 'drafts/a.md': A_MD },
    async (app, cookie, library) => {
      // (a) No styleProfile in project.yaml: an info note at line 1, and the check passes.
      const none = preflightResultSchema.parse(
        JSON.parse((await postPreflight(app, cookie)).body),
      );
      const noneCheck = none.checks.find(
        (check) => check.id === 'banned-phrases',
      );
      expect(noneCheck?.status).toBe('pass');
      expect(noneCheck?.findings).toEqual([
        {
          check: 'banned-phrases',
          severity: 'info',
          path: 'project.yaml',
          line: 1,
          message: NO_PROFILE,
        },
      ]);

      // (b) The house style names its banned phrases: three occurrences, none in code.
      putFile(library, join('book', 'entities', 'house-style.md'), HOUSE_STYLE);
      putFile(library, join('book', 'project.yaml'), HOUSE_PROJECT);
      const house = preflightResultSchema.parse(
        JSON.parse((await postPreflight(app, cookie)).body),
      );
      const houseCheck = house.checks.find(
        (check) => check.id === 'banned-phrases',
      );
      expect(houseCheck?.status).toBe('warn');
      const warnings = houseCheck?.findings ?? [];
      expect(
        warnings.map((finding) => [
          finding.severity,
          finding.path,
          finding.line,
          A_MD.slice(
            finding.offset ?? -1,
            (finding.offset ?? 0) + (finding.length ?? 0),
          ),
          finding.message,
        ]),
      ).toEqual([
        ['warning', 'drafts/a.md', 3, 'game\nchanger', BANNED_MESSAGE],
        ['warning', 'drafts/a.md', 6, 'Game Changer', BANNED_MESSAGE],
        ['warning', 'drafts/a.md', 7, 'unlock your potential', BANNED_MESSAGE],
      ]);

      // (c) A styleProfile that names no usable style profile: one warning at its line, and no phrase finding.
      putFile(library, join('book', 'project.yaml'), GHOST_PROJECT);
      const ghost = preflightResultSchema.parse(
        JSON.parse((await postPreflight(app, cookie)).body),
      );
      const ghostCheck = ghost.checks.find(
        (check) => check.id === 'banned-phrases',
      );
      expect(ghostCheck?.status).toBe('warn');
      expect(ghostCheck?.findings).toEqual([
        {
          check: 'banned-phrases',
          severity: 'warning',
          path: 'project.yaml',
          line: 4,
          message: UNUSABLE,
        },
      ]);
    },
  );
});
