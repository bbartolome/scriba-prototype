import {
  RUN_LOG_FOLDER,
  type RunLogEntry,
  runLogEntrySchema,
} from '@bbartolome/scriba-contracts/graph-runner';

// The project path of the log of a run: logs/recipe-runs/<runId>.jsonl (GRR-07 D1).
export function runLogPathOf(runId: string): string {
  return `${RUN_LOG_FOLDER}/${runId}.jsonl`;
}

// The line of one entry: the contract's keys only, in one JSON line (GRR-07 S2).
export function runLogLineOf(entry: RunLogEntry): string {
  return JSON.stringify(runLogEntrySchema.parse(entry));
}

// The entries of a log that parse against the contract. A blank or damaged line is skipped (GRR-07 S12).
export function parseRunLog(content: string): RunLogEntry[] {
  const entries: RunLogEntry[] = [];
  for (const raw of content.split('\n')) {
    if (raw.trim() === '') continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }
    const entry = runLogEntrySchema.safeParse(json);
    if (entry.success) entries.push(entry.data);
  }
  return entries;
}
