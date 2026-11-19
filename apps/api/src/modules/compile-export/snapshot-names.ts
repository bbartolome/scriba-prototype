// Pure helpers of the snapshot store (P2, P3, P8). No I/O.

// The label of the automatic snapshot that a restore takes first (P10 step 1).
export const PRE_RESTORE_LABEL = 'pre-restore';

// The slug of a label (P2): NFKD, combining marks removed, lower case, each run outside [a-z0-9] one '-', no
// leading or trailing '-', at most 40 characters. An empty result is `snapshot`.
export function slugOf(label: string): string {
  const slug = label
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return slug === '' ? 'snapshot' : slug;
}

// The UTC stamp of an instant, YYYYMMDDTHHmmssZ (P3).
export function stampOf(now: Date): string {
  return now
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
}

// The first of `base`, `base-2`, `base-3`, ... that is not taken (P3).
export function freeName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// The label of a folder name without its `-<ts>` and `-n` (P8), for a snapshot whose manifest cannot be read.
export function labelOfFolder(name: string): string {
  return name.replace(/-\d{8}T\d{6}Z(-\d+)?$/, '');
}
