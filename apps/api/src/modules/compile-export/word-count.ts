// Word counts of one manuscript file (P16 to P18). Pure: no I/O.

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
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const URL = /(?:https?:\/\/|www\.)\S+/gi;
const LINK_TARGET = /\]\([^)]*\)/g;
const SEGMENTER = new Intl.Segmenter('en', { granularity: 'word' });

function bare(line: string): string {
  return line.replace(/(?:\r\n|\n|\r)$/, '');
}

// The body of a file after its YAML front matter (P16): the Shell's block rule, copied, not imported.
function bodyOf(text: string): string {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const lines = source.match(LINE) ?? [];
  const [opening, second] = lines;
  if (opening === undefined || second === undefined) return source;
  if (!OPENING.test(bare(opening))) return source;
  if (BLANK.test(bare(second))) return source;
  for (let i = 1; i < lines.length; i++) {
    if (!CLOSING.test(bare(lines[i]))) continue;
    const between = lines
      .slice(1, i)
      .map(bare)
      .find((line) => !BLANK.test(line));
    if (between !== undefined && !YAML_SHAPE.test(between)) return source;
    return lines
      .slice(i + 1)
      .join('')
      .replace(LEADING_BLANK_LINES, '');
  }
  return source;
}

// Removes fenced code (P17): from an opening fence of three or more backticks or tildes through the closing fence of
// the same character and at least the same length. An unclosed fence runs to the end of the text.
function withoutFences(text: string): string {
  const kept: string[] = [];
  let open: { char: string; length: number } | undefined;
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (open === undefined) {
      const match = FENCE_OPEN.exec(line);
      if (match?.[1] !== undefined) {
        open = { char: match[1][0], length: match[1].length };
      } else {
        kept.push(line);
      }
      continue;
    }
    const close = FENCE_CLOSE.exec(line);
    if (
      close?.[1] !== undefined &&
      close[1][0] === open.char &&
      close[1].length >= open.length
    ) {
      open = undefined;
    }
  }
  return kept.join('\n');
}

// Counts the words of a file's text (P16 to P18). The rule is the same for every file, so the totals are sums.
export function countWords(text: string): number {
  const cleaned = withoutFences(bodyOf(text).replace(HTML_COMMENT, ''))
    .replace(URL, '')
    .replace(LINK_TARGET, ']');
  let count = 0;
  for (const segment of SEGMENTER.segment(cleaned)) {
    if (segment.isWordLike === true) count += 1;
  }
  return count;
}
