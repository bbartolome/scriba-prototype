import { expect, it } from 'vitest';
import {
  PREFLIGHT_ROUTE,
  preflightResultSchema,
} from '@bbartolome/scriba-contracts/compile-export';
import { type TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { withManuscript } from './compile-export-manuscript.kit';

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
const LINKS = 'The links in the front matter must be a list of entity IDs.';
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
