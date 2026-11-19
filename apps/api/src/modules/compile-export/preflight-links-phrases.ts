import { isScalar, isSeq, parseDocument } from 'yaml';
import { type PreflightFinding } from '@bbartolome/scriba-contracts/compile-export';
import { CITATION_PATTERN } from '@bbartolome/scriba-contracts/project-store';
import { maskCode, splitFrontMatter } from './markdown-text';
import {
  lineOf,
  type PreflightFile,
  type PreflightInput,
  type PreflightRunner,
} from './preflight-checks';

type Finding = Omit<PreflightFinding, 'check'>;
type Range = [number, number, number];

// One thing the entity-links check found, before the entity resolution is known (P4 to P6). An `id` hit is settled by
// the resolution; a link or a front-matter hit already carries its message.
interface Hit {
  offset: number;
  length: number;
  id?: string;
  ref?: Record<string, string>;
  message?: string;
}

const UNKNOWN_MESSAGE = 'Entity reference names no entity.';
const DUPLICATE_MESSAGE = 'Entity reference names more than one entity.';
const LINKS_INVALID_MESSAGE =
  'The links in the front matter must be a list of entity IDs.';
const MISSING_MESSAGE = 'Link or image names no file in the project.';
const REFUSED_MESSAGE =
  'Link or image does not name a file inside the project.';

// The citation pattern of the Project store, with `g` so each token is scanned (S2).
const CITATIONS = new RegExp(CITATION_PATTERN.source, 'g');
// The ids inside one citation token: each `@id` is one occurrence (P4).
const CITED_ID = /@[a-z0-9][a-z0-9-]*/g;
// An inline destination, `](dest)` or `](dest "title")`; an image is `![alt](dest)`, so one pattern covers both (P6).
const INLINE_LINK = /\]\(([^)\s]*)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
// A reference definition, `[label]: dest`. A footnote definition `[^1]: ...` is not a link (P6).
const DEFINITION = /^ {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*(\S+)/gm;
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

// The offset just after the first line terminator of the file, where the front-matter YAML starts (P5).
function yamlStartOf(content: string): number {
  const first = /\r\n|\n|\r/.exec(content);
  return first === null ? 0 : first.index + first[0].length;
}

// The ids and the errors of a front-matter `links` value (P5). Nothing for a missing or null value, and for a block
// the YAML parser cannot read.
function frontMatterHits(content: string, yaml: string | undefined): Hit[] {
  if (yaml === undefined) return [];
  const doc = parseDocument(yaml);
  if (doc.errors.length > 0) return [];
  const node: unknown = doc.get('links', true);
  if (node === undefined) return [];
  if (isScalar(node) && node.value === null) return [];
  const start = yamlStartOf(content);
  // The offset and length of a YAML node in the file (P5); undefined when the node has no source range.
  const span = (value: unknown) => {
    const range = (value as { range?: Range | null } | null)?.range;
    return range
      ? { offset: start + range[0], length: range[1] - range[0] }
      : undefined;
  };
  if (!isSeq(node)) {
    const where = span(node);
    return where === undefined
      ? []
      : [{ ...where, message: LINKS_INVALID_MESSAGE }];
  }
  const hits: Hit[] = [];
  for (const item of node.items as unknown[]) {
    const where = span(item);
    if (where === undefined) continue;
    if (isScalar(item) && typeof item.value === 'string') {
      hits.push({ ...where, id: item.value, ref: { id: item.value } });
    } else {
      hits.push({ ...where, message: LINKS_INVALID_MESSAGE });
    }
  }
  return hits;
}

// The ids of the in-body citations, each `@id` at its own offset (P4). Code is masked before the scan (P3).
function citationHits(masked: string, bodyStart: number): Hit[] {
  const hits: Hit[] = [];
  for (const token of masked.matchAll(CITATIONS)) {
    const tokenOffset = bodyStart + (token.index ?? 0);
    for (const cited of token[0].matchAll(CITED_ID)) {
      const id = cited[0].slice(1);
      hits.push({
        offset: tokenOffset + (cited.index ?? 0),
        length: cited[0].length,
        id,
        ref: { id },
      });
    }
  }
  return hits;
}

// The target of a destination as written, or undefined when the destination is not a project path (P6). `at` is where
// the text starts (after a `<`), `length` its length as written.
function destinationOf(
  raw: string,
): { target: string; at: number; length: number } | undefined {
  let text = raw;
  let at = 0;
  if (text.startsWith('<')) {
    if (!text.endsWith('>') || text.length < 2) return undefined;
    text = text.slice(1, -1);
    at = 1;
  }
  if (text === '' || text.startsWith('#') || text.startsWith('//'))
    return undefined;
  if (SCHEME.test(text)) return undefined;
  const cut = text.search(/[?#]/);
  const base = cut < 0 ? text : text.slice(0, cut);
  if (base === '') return undefined;
  let target = base;
  try {
    target = decodeURIComponent(base);
  } catch {
    // The text as written, when it is not a valid escape (P6).
  }
  return { target, at, length: text.length };
}

// The Markdown link and image hits of the body (P6). Each destination is asked of the store once (P7).
function linkHits(
  masked: string,
  bodyStart: number,
  targetOf: PreflightInput['targetOf'],
): Hit[] {
  const hits: Hit[] = [];
  const candidates: { raw: string; start: number }[] = [];
  for (const match of masked.matchAll(INLINE_LINK)) {
    candidates.push({ raw: match[1], start: (match.index ?? 0) + 2 });
  }
  for (const match of masked.matchAll(DEFINITION)) {
    candidates.push({
      raw: match[1],
      start: (match.index ?? 0) + match[0].length - match[1].length,
    });
  }
  for (const { raw, start } of candidates) {
    const destination = destinationOf(raw);
    if (destination === undefined) continue;
    const offset = bodyStart + start + destination.at;
    const outcome = targetOf(destination.target);
    if (outcome === 'file') continue;
    hits.push({
      offset,
      length: destination.length,
      ref: { target: destination.target },
      message: outcome === 'missing' ? MISSING_MESSAGE : REFUSED_MESSAGE,
    });
  }
  return hits;
}

// Every hit of one file, sorted by offset (P12).
function hitsOf(
  file: PreflightFile,
  targetOf: PreflightInput['targetOf'],
): Hit[] {
  const { yaml, body } = splitFrontMatter(file.content);
  const bodyStart = file.content.length - body.length;
  const masked = maskCode(body);
  return [
    ...frontMatterHits(file.content, yaml),
    ...citationHits(masked, bodyStart),
    ...linkHits(masked, bodyStart, targetOf),
  ].sort((a, b) => a.offset - b.offset);
}

// Entity references and Markdown links that do not resolve (S1 to S5). Errors only.
export const entityLinksCheck: PreflightRunner = {
  id: 'entity-links',
  run(input) {
    const perFile = input.files.map((file) => ({
      file,
      hits: hitsOf(file, input.targetOf),
    }));
    const ids = [
      ...new Set(
        perFile.flatMap(({ hits }) =>
          hits.flatMap((hit) => (hit.id === undefined ? [] : [hit.id])),
        ),
      ),
    ];
    const status = new Map<string, 'ok' | 'unknown' | 'duplicate'>();
    if (ids.length > 0) {
      const resolution = input.resolveIds(ids);
      for (const resolved of resolution.resolved) status.set(resolved.id, 'ok');
      for (const error of resolution.errors) status.set(error.id, error.code);
    }

    const findings: Finding[] = [];
    for (const { file, hits } of perFile) {
      for (const hit of hits) {
        let message = hit.message;
        if (hit.id !== undefined) {
          const outcome = status.get(hit.id);
          if (outcome === 'ok') continue;
          message =
            outcome === 'duplicate' ? DUPLICATE_MESSAGE : UNKNOWN_MESSAGE;
        }
        findings.push({
          severity: 'error',
          path: file.path,
          line: lineOf(file.content, hit.offset),
          offset: hit.offset,
          length: hit.length,
          message: message ?? UNKNOWN_MESSAGE,
          ...(hit.ref === undefined ? {} : { ref: hit.ref }),
        });
      }
    }
    return findings;
  },
};

const BANNED_MESSAGE = 'Banned phrase left in the text.';
const NO_PROFILE_MESSAGE =
  'No style profile is set in project.yaml, so banned phrases were not checked.';
const UNUSABLE_MESSAGE =
  'The style profile gives no usable bannedPhrases list, so banned phrases were not checked.';
// A letter, a number or an underscore: a phrase must not start or end inside a word (P10).
const WORD_CHAR = '[\\p{L}\\p{N}_]';

// The start of a YAML node in the file, or 0 when it has no source range.
function rangeStart(value: unknown): number {
  return (value as { range?: Range | null } | null)?.range?.[0] ?? 0;
}

// The banned phrases of the style profile the project names (P9): the phrases, or the one finding that says why
// there are none. The profile is an entity of type style-profile, read through the Project store.
function bannedPhrasesOf(
  input: PreflightInput,
): { phrases: string[] } | { finding: Finding } {
  const noProfile: Finding = {
    severity: 'info',
    path: 'project.yaml',
    line: 1,
    message: NO_PROFILE_MESSAGE,
  };
  const text = input.readText('project.yaml');
  if (text === undefined) return { finding: noProfile };
  const doc = parseDocument(text);
  if (doc.errors.length > 0) return { finding: noProfile };
  const value: unknown = doc.get('styleProfile', true);
  if (value === undefined || (isScalar(value) && value.value === null)) {
    return { finding: noProfile };
  }
  const unusable: { finding: Finding } = {
    finding: {
      severity: 'warning',
      path: 'project.yaml',
      line: lineOf(text, rangeStart(value)),
      message: UNUSABLE_MESSAGE,
    },
  };
  if (!isScalar(value) || typeof value.value !== 'string') return unusable;
  const id = value.value;
  const resolution = input.resolveIds([id]);
  const entity =
    resolution.resolved.length === 1 ? resolution.resolved[0] : undefined;
  if (entity?.type !== 'style-profile') return unusable;
  const profileYaml = splitFrontMatter(entity.content).yaml;
  if (profileYaml === undefined) return unusable;
  const profile = parseDocument(profileYaml);
  if (profile.errors.length > 0) return unusable;
  const list: unknown = (profile.toJS() as { bannedPhrases?: unknown } | null)
    ?.bannedPhrases;
  if (!Array.isArray(list) || !list.every((item) => typeof item === 'string')) {
    return unusable;
  }
  return {
    phrases: list
      .map((item: string) => item.trim())
      .filter((item) => item !== ''),
  };
}

// The pattern of one phrase (P10): case-insensitive, whole phrase, each word escaped, whitespace across a line break.
function phrasePattern(phrase: string): RegExp {
  const words = phrase
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(
    `(?<!${WORD_CHAR})${words.join('\\s+')}(?!${WORD_CHAR})`,
    'giu',
  );
}

// Banned phrases in the body of each file, outside code, every occurrence reported (P9 to P11). Warnings only.
export const bannedPhrasesCheck: PreflightRunner = {
  id: 'banned-phrases',
  run(input) {
    const profile = bannedPhrasesOf(input);
    if ('finding' in profile) return [profile.finding];
    const patterns = profile.phrases.map((phrase) => ({
      phrase,
      pattern: phrasePattern(phrase),
    }));
    const findings: Finding[] = [];
    for (const file of input.files) {
      const { body } = splitFrontMatter(file.content);
      const bodyStart = file.content.length - body.length;
      // Code is blanked with NUL, so no phrase is joined across a removed code span (P3).
      const masked = maskCode(body, '\u0000');
      const hits: Finding[] = [];
      for (const { phrase, pattern } of patterns) {
        for (const match of masked.matchAll(pattern)) {
          const offset = bodyStart + (match.index ?? 0);
          hits.push({
            severity: 'warning',
            path: file.path,
            line: lineOf(file.content, offset),
            offset,
            length: match[0].length,
            message: BANNED_MESSAGE,
            ref: { phrase },
          });
        }
      }
      findings.push(...hits.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0)));
    }
    return findings;
  },
};
