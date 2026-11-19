import {
  PLACEHOLDER_PATTERN,
  type ManuscriptPart,
  type ManuscriptView,
  type PreflightCheckId,
  type PreflightFinding,
} from '@bbartolome/scriba-contracts/compile-export';
import type { StoryGraph } from '@bbartolome/scriba-contracts/graph-runner';
import type { EntityResolution } from '@bbartolome/scriba-contracts/project-store';
import { maskCode, splitFrontMatter } from './markdown-text';

// One manuscript file as the checks read it: its view entry, its text and its hash, as the Project store decodes
// and hashes it (P10, P2).
export interface PreflightFile {
  path: string;
  part: ManuscriptPart;
  content: string;
  hash: string;
}

// What a link target is in the project (P7): a file, a missing path, or a path the store refuses.
export type LinkTarget = 'file' | 'missing' | 'refused';

// The input of every runner (P10). It is internal to the module.
export interface PreflightInput {
  projectId: string;
  view: ManuscriptView;
  files: PreflightFile[];
  // The valid story graphs with their files (P2).
  storyGraphs: { path: string; graph: StoryGraph }[];
  // The text of a project file, or undefined when the store cannot read it as text (P2).
  readText(path: string): string | undefined;
  // Resolves entity ids through the Project store (P2, S4).
  resolveIds(ids: string[]): EntityResolution;
  // Says what a project-relative path is (P7).
  targetOf(path: string): LinkTarget;
}

// A check. It returns its findings; the framework adds `check` and derives the status (P8).
export interface PreflightRunner {
  id: PreflightCheckId;
  run(input: PreflightInput): Omit<PreflightFinding, 'check'>[];
}

const PLACEHOLDER_MESSAGE = 'Placeholder word left in the text.';
const UNRENDERED_MESSAGE = 'Unrendered placeholder left in the text.';

// One-based line of an offset: 1 plus the line terminators before it (P5).
export function lineOf(text: string, offset: number): number {
  return (text.slice(0, offset).match(/\r\n|\n|\r/g) ?? []).length + 1;
}

// Placeholder words and unrendered braces in the body of each file, outside code (P4 to P7).
export const placeholdersCheck: PreflightRunner = {
  id: 'placeholders',
  run({ files }) {
    const findings: Omit<PreflightFinding, 'check'>[] = [];
    const pattern = new RegExp(PLACEHOLDER_PATTERN.source, 'g');
    for (const file of files) {
      const body = splitFrontMatter(file.content).body;
      const bodyStart = file.content.length - body.length;
      const masked = maskCode(body);
      for (const match of masked.matchAll(pattern)) {
        const offset = bodyStart + (match.index ?? 0);
        findings.push({
          severity: 'error',
          path: file.path,
          line: lineOf(file.content, offset),
          offset,
          length: match[0].length,
          message: match[0].startsWith('{{')
            ? UNRENDERED_MESSAGE
            : PLACEHOLDER_MESSAGE,
        });
      }
    }
    return findings;
  },
};
