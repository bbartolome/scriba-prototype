import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  PREFLIGHT_ROUTE,
  preflightResultSchema,
  type PreflightCheck,
  type PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import { createTestApp, type TestApp } from './create-test-app';
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

// The check of an id. Checks are looked up by id, never by index.
function checkOf(result: PreflightResult, id: string): PreflightCheck {
  const check = result.checks.find((entry) => entry.id === id);
  if (check === undefined) throw new Error(`no check ${id}`);
  return check;
}

// The `sha256:` hash of a text's UTF-8 bytes, in the form of the Project store and the Agent loop.
function hashOf(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

// One-based line of an offset in a text: 1 plus the line feeds before it.
function lineAt(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}

// The claim as the Agent loop writes it: its span is an offset into the text the engine checked.
function claimOf(
  text: string,
  claim: string,
  verdict: 'supported' | 'weak' | 'unsupported',
  passage?: { path: string; offset: number; snippet: string },
): Record<string, unknown> {
  const start = text.indexOf(claim);
  return {
    text: claim,
    span: { start, end: start + claim.length },
    verdict,
    ...(passage === undefined ? {} : { passage }),
    reason: `${verdict} in the test fixture`,
  };
}

// The text of a grounding-result artefact of the Agent loop's format (schema version 1 unless it says otherwise).
function artefactText(
  targetPath: string,
  contentHash: string,
  claims: Record<string, unknown>[],
  schemaVersion: number = 1,
): string {
  return `${JSON.stringify(
    {
      schemaVersion,
      targetPath,
      contentHash,
      checkedAt: '2026-11-19T10:00:00.000Z',
      runId: 'run-claims-fixture',
      claims,
    },
    null,
    2,
  )}\n`;
}

const K1_A = [
  'Harbour traffic doubled in 1900.',
  'The town has a river.',
  'The bridge opened in 1931.',
  '',
].join('\n');
const K1_A_PASSAGE = {
  path: 'sources/notes.md',
  offset: 0,
  snippet: 'The town has a river.',
};
const K1_B = 'The old mill burned.\n';
const K1_B_OLD_CLAIM = 'The old mill stood.';

it('claims: unsupported is an error, weak a warning, a changed file an info', async () => {
  const files: Record<string, string> = {
    'drafts/a.md': K1_A,
    'drafts/b.md': K1_B,
    'logs/grounding/drafts/a.md.json': artefactText(
      'drafts/a.md',
      hashOf(K1_A),
      [
        claimOf(K1_A, 'Harbour traffic doubled in 1900.', 'unsupported'),
        claimOf(K1_A, 'The town has a river.', 'supported', K1_A_PASSAGE),
        claimOf(K1_A, 'The bridge opened in 1931.', 'weak', K1_A_PASSAGE),
      ],
    ),
    // The artefact checked an older text of b.md, so its hash no longer matches the file.
    'logs/grounding/drafts/b.md.json': artefactText(
      'drafts/b.md',
      hashOf(K1_B_OLD_CLAIM),
      [claimOf(K1_B_OLD_CLAIM, K1_B_OLD_CLAIM, 'unsupported')],
    ),
  };
  await withManuscript(files, async (app, cookie) => {
    const reply = await postPreflight(app, cookie);
    expect(reply.status).toBe(200);
    const result = preflightResultSchema.parse(JSON.parse(reply.body));

    const claims = checkOf(result, 'unsupported-claims');
    expect(claims.status).toBe('fail');
    const findings = claims.findings;
    expect(
      findings.map((finding) => ({
        check: finding.check,
        severity: finding.severity,
        path: finding.path,
        line: finding.line,
        message: finding.message,
        ref: finding.ref,
      })),
    ).toEqual([
      {
        check: 'unsupported-claims',
        severity: 'error',
        path: 'drafts/a.md',
        line: 1,
        message: 'Claim not supported by the sources.',
        ref: { text: 'Harbour traffic doubled in 1900.' },
      },
      {
        check: 'unsupported-claims',
        severity: 'warning',
        path: 'drafts/a.md',
        line: 3,
        message: 'Claim only weakly supported by the sources.',
        ref: {
          text: 'The bridge opened in 1931.',
          passage: K1_A_PASSAGE,
        },
      },
      {
        check: 'unsupported-claims',
        severity: 'info',
        path: 'drafts/b.md',
        line: 1,
        message:
          'Changed since grounding check. Run a grounding check from the Agent loop.',
        ref: undefined,
      },
      {
        check: 'unsupported-claims',
        severity: 'error',
        path: 'drafts/b.md',
        line: 1,
        message: 'Claim not supported by the sources.',
        ref: { text: K1_B_OLD_CLAIM },
      },
    ]);

    // The offsets and lengths point at the claim's text in the current file.
    const [first, second, , fourth] = findings;
    expect(first.offset).toBe(K1_A.indexOf('Harbour traffic doubled in 1900.'));
    expect(first.length).toBe('Harbour traffic doubled in 1900.'.length);
    expect(
      K1_A.slice(first.offset ?? -1, (first.offset ?? 0) + (first.length ?? 0)),
    ).toBe('Harbour traffic doubled in 1900.');
    expect(second.offset).toBe(K1_A.indexOf('The bridge opened in 1931.'));
    expect(lineAt(K1_A, second.offset ?? -1)).toBe(3);
    expect(findings[2].offset).toBeUndefined();
    expect(fourth.offset).toBe(0);
    expect(fourth.length).toBe(K1_B_OLD_CLAIM.length);
    // The old claim's span (0 to 19) lies in the current text, which the finding points into.
    expect(
      K1_B.slice(
        fourth.offset ?? -1,
        (fourth.offset ?? 0) + (fourth.length ?? 0),
      ),
    ).toBe('The old mill burned'.slice(0, K1_B_OLD_CLAIM.length));

    // The supported claim gives nothing: the findings above are all of them.
  });
});

it('claims: a missing, unparseable or older-version artefact is not grounding-checked', async () => {
  const current = 'A checked sentence.\n';
  await withManuscript(
    {
      // c has no artefact.
      'drafts/c.md': 'Sentence c.\n',
      // d has an artefact that is not JSON.
      'drafts/d.md': 'Sentence d.\n',
      'logs/grounding/drafts/d.md.json': '{ not json',
      // e has an otherwise valid artefact of schema version 2.
      'drafts/e.md': 'Sentence e.\n',
      'logs/grounding/drafts/e.md.json': artefactText(
        'drafts/e.md',
        hashOf('Sentence e.\n'),
        [claimOf('Sentence e.\n', 'Sentence e.', 'unsupported')],
        2,
      ),
      // f has a valid artefact with the matching hash and one supported claim.
      'drafts/f.md': current,
      'logs/grounding/drafts/f.md.json': artefactText(
        'drafts/f.md',
        hashOf(current),
        [claimOf(current, 'A checked sentence.', 'supported')],
      ),
    },
    async (app, cookie) => {
      const reply = await postPreflight(app, cookie);
      expect(reply.status).toBe(200);
      const result = preflightResultSchema.parse(JSON.parse(reply.body));

      const claims = checkOf(result, 'unsupported-claims');
      expect(claims.status).toBe('pass');
      expect(
        claims.findings.map((finding) => [
          finding.severity,
          finding.path,
          finding.line,
          finding.message,
        ]),
      ).toEqual([
        [
          'info',
          'drafts/c.md',
          1,
          'Not grounding-checked. Run a grounding check from the Agent loop.',
        ],
        [
          'info',
          'drafts/d.md',
          1,
          'Not grounding-checked. Run a grounding check from the Agent loop.',
        ],
        [
          'info',
          'drafts/e.md',
          1,
          'Not grounding-checked. Run a grounding check from the Agent loop.',
        ],
      ]);
    },
  );
});
