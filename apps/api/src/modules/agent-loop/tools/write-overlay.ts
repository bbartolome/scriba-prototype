import type { DraftProvenance } from '@bbartolome/scriba-contracts/agent-loop';

// One proposed text of a path: the latest content, the call that wrote it last, and the draft provenance when a
// narrative tool made it (AGL-13 sets it).
export interface OverlayEntry {
  path: string;
  content: string;
  callId: string;
  provenance?: DraftProvenance;
}

// The run overlay of one agent run (AGL-12 D1, D2). It holds the captured base of each path, taken at the first
// read or write of the path, and the proposed text of each written path, in first-write order. It only holds
// text: the disk is not touched here. It holds no Nest code.
export class WriteOverlay {
  private readonly bases = new Map<string, string | null>();
  private readonly written = new Map<string, OverlayEntry>();

  // Whether the base of the path is captured already.
  isCaptured(path: string): boolean {
    return this.bases.has(path);
  }

  // Captures the base of the path. A second capture of the same path changes nothing.
  capture(path: string, base: string | null): void {
    if (!this.bases.has(path)) this.bases.set(path, base);
  }

  // The captured base of the path: the text, null for a file that did not exist, or undefined when not captured.
  baseOf(path: string): string | null | undefined {
    return this.bases.get(path);
  }

  // The proposed text of the path, or undefined when the run has not written it.
  contentOf(path: string): string | undefined {
    return this.written.get(path)?.content;
  }

  // Records a written text. The path keeps its first-write position; the content and the call are the latest.
  put(
    path: string,
    content: string,
    callId: string,
    provenance?: DraftProvenance,
  ): void {
    const entry: OverlayEntry = { path, content, callId };
    if (provenance !== undefined) entry.provenance = provenance;
    this.written.set(path, entry);
  }

  // Every written path, in the order of the first write.
  entriesInOrder(): OverlayEntry[] {
    return [...this.written.values()];
  }
}
