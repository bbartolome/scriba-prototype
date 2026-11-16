// A three-way merge of line hunks, with conflicts found by paragraph (PST-17 decision D5).
import { alignLines, linesOf } from './unified-diff';

// One run of changed lines of one side: base lines [start, end) are replaced by lines. The reach widens the base
// range to whole paragraphs, so that edits to one paragraph conflict even when they are on different lines.
interface Hunk {
  side: 'ours' | 'theirs';
  start: number;
  end: number;
  lines: string[];
  reachStart: number;
  reachEnd: number;
}

function isBlank(line: string): boolean {
  return line.trim() === '';
}

function hunksOf(
  baseLines: string[],
  text: string,
  side: 'ours' | 'theirs',
): Hunk[] {
  const hunks: Hunk[] = [];
  let at = 0;
  let current: Hunk | null = null;
  for (const op of alignLines(baseLines, linesOf(text))) {
    if (op.tag === ' ') {
      if (current !== null) {
        hunks.push(current);
        current = null;
      }
      at++;
      continue;
    }
    if (current === null) {
      current = {
        side,
        start: at,
        end: at,
        lines: [],
        reachStart: at,
        reachEnd: at,
      };
    }
    if (op.tag === '-') {
      at++;
      current.end = at;
    } else {
      current.lines.push(op.line);
    }
  }
  if (current !== null) hunks.push(current);

  for (const hunk of hunks) {
    let s = hunk.start;
    while (s > 0 && !isBlank(baseLines[s - 1])) s--;
    let e = hunk.end;
    while (e < baseLines.length && !isBlank(baseLines[e])) e++;
    hunk.reachStart = s;
    hunk.reachEnd = e;
  }
  return hunks;
}

function sameLines(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((line, k) => line === b[k]);
}

// The merged text of the base with the proposal (ours) and the disk (theirs), or undefined on a conflict.
export function mergeLines(
  base: string,
  ours: string,
  theirs: string,
): string | undefined {
  const baseLines = linesOf(base);
  const all = [
    ...hunksOf(baseLines, ours, 'ours'),
    ...hunksOf(baseLines, theirs, 'theirs'),
  ].sort((a, b) => a.reachStart - b.reachStart || a.reachEnd - b.reachEnd);

  // Clusters: a hunk joins the current cluster while its reach starts at or before the cluster's largest reach end.
  const clusters: Hunk[][] = [];
  let maxEnd = -1;
  for (const hunk of all) {
    const last = clusters[clusters.length - 1];
    if (last !== undefined && hunk.reachStart <= maxEnd) {
      last.push(hunk);
      maxEnd = Math.max(maxEnd, hunk.reachEnd);
    } else {
      clusters.push([hunk]);
      maxEnd = hunk.reachEnd;
    }
  }

  const applied: Hunk[] = [];
  for (const members of clusters) {
    const sides = new Set(members.map((h) => h.side));
    if (sides.size === 1) {
      applied.push(...members);
      continue;
    }
    // Both sides in one cluster: merged only when both made the identical change, which is applied once.
    const [first, second] = members;
    if (
      members.length === 2 &&
      first.start === second.start &&
      first.end === second.end &&
      sameLines(first.lines, second.lines)
    ) {
      applied.push(first.side === 'ours' ? first : second);
      continue;
    }
    return undefined;
  }

  applied.sort((a, b) => a.start - b.start || a.end - b.end);
  const output: string[] = [];
  let position = 0;
  for (const hunk of applied) {
    // Defensive: applied hunks never overlap, so a hunk that starts before the last end is a conflict.
    if (hunk.start < position) return undefined;
    for (const line of baseLines.slice(position, hunk.start)) output.push(line);
    for (const line of hunk.lines) output.push(line);
    position = hunk.end;
  }
  for (const line of baseLines.slice(position)) output.push(line);
  return output.join('\n');
}
