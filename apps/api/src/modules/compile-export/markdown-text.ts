// Markdown text helpers of the compile-export slice (P2, P10, P17). Pure: no I/O. word-count.ts and the assembly
// builder share them, so the module has one front-matter rule and one fence rule.

const BOM = '\u{FEFF}';
const OPENING = /^---[ \t]*$/;
const CLOSING = /^(?:---|\.\.\.)[ \t]*$/;
const BLANK = /^[ \t]*$/;
// A YAML comment or a mapping key; the guard that stands in for a YAML parser (the Shell's rule, SHL-11 decision 5).
const YAML_SHAPE = /^(?:#|[^\s#:][^:]*:(?:[ \t]|$))/;
const LEADING_BLANK_LINES = /^(?:[ \t]*(?:\r\n|\n|\r))+/;
const LINE = /[^\r\n]*(?:\r\n|\n|\r)|[^\r\n]+$/g;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const INLINE_CODE = /(`+)[^\n]*?\1/g;
const CITATION = /\[@[a-z0-9][a-z0-9-]*(?:; @[a-z0-9][a-z0-9-]*)*\]/g;
const CITED_ID = /@([a-z0-9][a-z0-9-]*)/g;

function bare(line: string): string {
  return line.replace(/(?:\r\n|\n|\r)$/, '');
}

// A file split into its YAML front matter and its body (P2). `yaml` is the text between the fences when the block
// passes the guard, and undefined otherwise. `body` is the text after the block with leading blank lines removed, or
// the whole text with any BOM removed when there is no block.
export function splitFrontMatter(text: string): {
  yaml: string | undefined;
  body: string;
} {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const lines = source.match(LINE) ?? [];
  const [opening, second] = lines;
  if (opening === undefined || second === undefined) {
    return { yaml: undefined, body: source };
  }
  if (!OPENING.test(bare(opening))) return { yaml: undefined, body: source };
  if (BLANK.test(bare(second))) return { yaml: undefined, body: source };
  for (let i = 1; i < lines.length; i++) {
    if (!CLOSING.test(bare(lines[i]))) continue;
    const between = lines
      .slice(1, i)
      .map(bare)
      .find((line) => !BLANK.test(line));
    if (between !== undefined && !YAML_SHAPE.test(between)) {
      return { yaml: undefined, body: source };
    }
    return {
      yaml: lines.slice(1, i).join(''),
      body: lines
        .slice(i + 1)
        .join('')
        .replace(LEADING_BLANK_LINES, ''),
    };
  }
  return { yaml: undefined, body: source };
}

// One flag per line (P2): the opening fence of three or more backticks or tildes, the lines inside it and the closing
// fence of the same character and at least the same length are flagged. An unclosed fence flags every line to the end.
export function fencedLines(lines: string[]): boolean[] {
  const flags: boolean[] = [];
  let open: { char: string; length: number } | undefined;
  for (const line of lines) {
    if (open === undefined) {
      const match = FENCE_OPEN.exec(line);
      if (match?.[1] !== undefined) {
        open = { char: match[1][0], length: match[1].length };
        flags.push(true);
      } else {
        flags.push(false);
      }
      continue;
    }
    flags.push(true);
    const close = FENCE_CLOSE.exec(line);
    if (
      close?.[1] !== undefined &&
      close[1][0] === open.char &&
      close[1].length >= open.length
    ) {
      open = undefined;
    }
  }
  return flags;
}

// Removes fenced code (P17): the lines that fencedLines flags.
export function withoutFences(text: string): string {
  const lines = text.split(/\r\n|\n|\r/);
  const flags = fencedLines(lines);
  return lines.filter((_, i) => !flags[i]).join('\n');
}

// The text with its code blanked (P3): same length, same line terminators. Fenced lines and inline code become spaces,
// so offsets and line numbers of the input hold in the output.
export function maskCode(text: string): string {
  const parts = text.split(/(\r\n|\n|\r)/);
  const flags = fencedLines(parts.filter((_, i) => i % 2 === 0));
  const masked = parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return flags[i / 2] ? part.replace(/[^\r\n]/g, ' ') : part;
    })
    .join('');
  return masked.replace(INLINE_CODE, (code) => code.replace(/[^\r\n]/g, ' '));
}

// The ids cited in a file's body (P10): front matter, fenced code and inline code are removed first, then every
// [@id] and [@a; @b] citation is read. Code is skipped because CEX-05 and CEX-07 skip it.
export function citationIds(text: string): Set<string> {
  const body = withoutFences(splitFrontMatter(text).body).replace(
    INLINE_CODE,
    '',
  );
  const ids = new Set<string>();
  for (const citation of body.match(CITATION) ?? []) {
    for (const match of citation.matchAll(CITED_ID)) {
      ids.add(match[1]);
    }
  }
  return ids;
}
