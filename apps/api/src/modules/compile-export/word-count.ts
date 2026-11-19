// Word counts of one manuscript file (P16 to P18). Pure: no I/O.
import { splitFrontMatter, withoutFences } from './markdown-text';

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const URL = /(?:https?:\/\/|www\.)\S+/gi;
const LINK_TARGET = /\]\([^)]*\)/g;
const SEGMENTER = new Intl.Segmenter('en', { granularity: 'word' });

// Counts the words of a file's text (P16 to P18). The rule is the same for every file, so the totals are sums.
export function countWords(text: string): number {
  const cleaned = withoutFences(
    splitFrontMatter(text).body.replace(HTML_COMMENT, ''),
  )
    .replace(URL, '')
    .replace(LINK_TARGET, ']');
  let count = 0;
  for (const segment of SEGMENTER.segment(cleaned)) {
    if (segment.isWordLike === true) count += 1;
  }
  return count;
}
