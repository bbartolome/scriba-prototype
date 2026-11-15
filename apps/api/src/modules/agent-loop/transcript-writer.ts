import { realpathSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import {
  AGENT_TRANSCRIPT_SCHEMA_VERSION,
  type AgentTranscriptKind,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { FilesService } from '../project-store/project-store.module';
import { TRANSCRIPT_TEXT_LIMIT, cutText } from './transcript-entries';

const logger = new Logger('AgentLoop');

// The transcript path of a run (D6): logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl, with the UTC start.
export function transcriptPathOf(startedAt: Date, runId: string): string {
  const stamp = startedAt.toISOString().replace(/[-:]/g, '').slice(0, 15);
  return `logs/agent-runs/${stamp}Z-${runId}.jsonl`;
}

export interface TranscriptWriterOptions {
  files: FilesService;
  projectId: string;
  path: string; // project-relative
  runId: string;
  conversationId: string;
  libraryRoot: string; // SCRIBA_BOOKS_DIR, as configured
}

// Applies a change to every string of a value, at any depth. Objects and arrays keep their shape (D8).
function mapStrings(value: unknown, change: (text: string) => string): unknown {
  if (typeof value === 'string') return change(value);
  if (Array.isArray(value))
    return value.map((item) => mapStrings(item, change));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapStrings(item, change),
      ]),
    );
  }
  return value;
}

// The configured library root and its real path, when the folder exists. Both are replaced (D7).
function libraryRootsOf(root: string): string[] {
  const roots = new Set<string>();
  if (root !== '') roots.add(root);
  try {
    roots.add(realpathSync.native(root));
  } catch {
    // A missing folder has no real path; the configured root is the only one.
  }
  return [...roots];
}

// The writer of one run's transcript (D5, D7, D8). Each line goes through the Project store's appendLog. It never
// throws into the loop: the first failure is logged once, and the later lines of the run are not attempted.
export class TranscriptWriter {
  private key: string | undefined;
  private failed = false;
  private readonly roots: string[];

  constructor(private readonly options: TranscriptWriterOptions) {
    this.roots = libraryRootsOf(options.libraryRoot);
  }

  // The resolved key of the run, once the resolve has settled (D4). Until then no key is replaced.
  setKey(key: string | undefined): void {
    this.key = key === undefined || key === '' ? undefined : key;
  }

  // Appends one line. The seq is the run's event counter at the time of the write (D3). Scrubbing comes before the
  // truncation, so a key cut at the limit cannot survive.
  append(
    kind: AgentTranscriptKind,
    seq: number,
    data: Record<string, unknown>,
  ): void {
    if (this.failed) return;
    try {
      const scrubbed = mapStrings(data, (text) => this.scrub(text));
      const payload = mapStrings(scrubbed, (text) =>
        cutText(text, TRANSCRIPT_TEXT_LIMIT, 'truncated'),
      );
      const line = JSON.stringify({
        schemaVersion: AGENT_TRANSCRIPT_SCHEMA_VERSION,
        at: new Date().toISOString(),
        runId: this.options.runId,
        conversationId: this.options.conversationId,
        seq,
        kind,
        data: payload,
      });
      this.options.files.appendLog(
        this.options.projectId,
        this.options.path,
        line,
      );
    } catch (error) {
      this.failed = true;
      const reason = error instanceof Error ? error.message : 'unknown error';
      logger.warn(
        `The transcript of run ${this.options.runId} could not be written: ${reason}`,
      );
    }
  }

  // Replaces the key and the library roots with their placeholders. The longer text is replaced first, so the real path
  // of the library, which contains its configured root on macOS, goes whole.
  private scrub(text: string): string {
    const pairs: Array<[string, string]> = this.roots.map((root) => [
      root,
      '<library>',
    ]);
    if (this.key !== undefined) pairs.push([this.key, '<key>']);
    pairs.sort((a, b) => b[0].length - a[0].length);
    return pairs.reduce((out, [from, to]) => out.split(from).join(to), text);
  }
}
