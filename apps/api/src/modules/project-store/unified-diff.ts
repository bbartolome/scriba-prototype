// A line diff in the unified form, written here so that no dependency is needed (PST-15 decision 19).

type Tag = ' ' | '-' | '+';

interface Op {
  tag: Tag;
  line: string;
}

const CONTEXT = 3;

// The lines whose middle is aligned with an LCS. Above this product of the two middle lengths, the middle is one
// hunk with every old line removed and then every new line added.
const LCS_BOUND = 4_000_000;

// An empty text has no lines. Any other text is split at each LF, so a text that ends in LF ends with an empty line.
function linesOf(text: string | null): string[] {
  if (text === null || text === '') return [];
  return text.split('\n');
}

// The operations of two line lists with no common leading or trailing line removed.
function middleOps(oldLines: string[], newLines: string[]): Op[] {
  const n = oldLines.length;
  const m = newLines.length;
  const ops: Op[] = [];
  if (n * m > LCS_BOUND) {
    for (const line of oldLines) ops.push({ tag: '-', line });
    for (const line of newLines) ops.push({ tag: '+', line });
    return ops;
  }
  // table[i][j] is the LCS length of oldLines[i..] and newLines[j..].
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        oldLines[i] === newLines[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ tag: ' ', line: oldLines[i] });
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      ops.push({ tag: '-', line: oldLines[i] });
      i++;
    } else {
      ops.push({ tag: '+', line: newLines[j] });
      j++;
    }
  }
  for (; i < n; i++) ops.push({ tag: '-', line: oldLines[i] });
  for (; j < m; j++) ops.push({ tag: '+', line: newLines[j] });
  return ops;
}

// The whole alignment: the common leading lines, the middle, and the common trailing lines.
function alignLines(oldLines: string[], newLines: string[]): Op[] {
  const shorter = Math.min(oldLines.length, newLines.length);
  let prefix = 0;
  while (prefix < shorter && oldLines[prefix] === newLines[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < shorter - prefix &&
    oldLines[oldLines.length - 1 - suffix] ===
      newLines[newLines.length - 1 - suffix]
  ) {
    suffix++;
  }
  const ops: Op[] = [];
  for (let k = 0; k < prefix; k++) ops.push({ tag: ' ', line: oldLines[k] });
  for (const op of middleOps(
    oldLines.slice(prefix, oldLines.length - suffix),
    newLines.slice(prefix, newLines.length - suffix),
  )) {
    ops.push(op);
  }
  for (let k = suffix; k > 0; k--) {
    ops.push({ tag: ' ', line: oldLines[oldLines.length - k] });
  }
  return ops;
}

// Within each run of changes, the removed lines come before the added lines, as diff -u writes them.
function orderRuns(ops: Op[]): Op[] {
  const out: Op[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].tag === ' ') {
      out.push(ops[k]);
      k++;
      continue;
    }
    const removed: Op[] = [];
    const added: Op[] = [];
    while (k < ops.length && ops[k].tag !== ' ') {
      if (ops[k].tag === '-') removed.push(ops[k]);
      else added.push(ops[k]);
      k++;
    }
    for (const op of removed) out.push(op);
    for (const op of added) out.push(op);
  }
  return out;
}

// The start and count of one side of a hunk header. An empty side names the line before it, as diff -u does.
function rangeOf(before: number, count: number): string {
  const start = count === 0 ? before : before + 1;
  return count === 1 ? `${start}` : `${start},${count}`;
}

// The unified diff of base against proposed, with 3 lines of context and hunks merged as diff -u merges them.
// base null is a new file. The result is '' when the two texts have the same lines, and otherwise ends in LF.
export function unifiedDiff(
  path: string,
  base: string | null,
  proposed: string,
): string {
  const ops = orderRuns(alignLines(linesOf(base), linesOf(proposed)));
  const changes: number[] = [];
  ops.forEach((op, k) => {
    if (op.tag !== ' ') changes.push(k);
  });
  if (changes.length === 0) return '';

  const ranges: { start: number; end: number }[] = [];
  for (const k of changes) {
    const start = Math.max(0, k - CONTEXT);
    const end = Math.min(ops.length - 1, k + CONTEXT);
    const last = ranges[ranges.length - 1];
    if (last !== undefined && start <= last.end + 1) {
      last.end = end;
    } else {
      ranges.push({ start, end });
    }
  }

  const out: string[] = [
    `--- ${base === null ? '/dev/null' : `a/${path}`}`,
    `+++ b/${path}`,
  ];
  let oldBefore = 0;
  let newBefore = 0;
  let k = 0;
  for (const range of ranges) {
    while (k < range.start) {
      if (ops[k].tag !== '+') oldBefore++;
      if (ops[k].tag !== '-') newBefore++;
      k++;
    }
    let oldCount = 0;
    let newCount = 0;
    const body: string[] = [];
    for (let q = range.start; q <= range.end; q++) {
      const op = ops[q];
      if (op.tag !== '+') oldCount++;
      if (op.tag !== '-') newCount++;
      body.push(`${op.tag}${op.line}`);
    }
    out.push(
      `@@ -${rangeOf(oldBefore, oldCount)} +${rangeOf(newBefore, newCount)} @@`,
    );
    for (const line of body) out.push(line);
  }
  return out.join('\n') + '\n';
}
