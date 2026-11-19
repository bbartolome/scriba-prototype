import {
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  groundingResultSchema,
  type GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { PreflightFinding } from '@bbartolome/scriba-contracts/compile-export';
import { LineCounter, parseDocument } from 'yaml';
import {
  lineOf,
  type PreflightFile,
  type PreflightInput,
  type PreflightRunner,
} from './preflight-checks';

type Finding = Omit<PreflightFinding, 'check'>;

const NOT_CHECKED_MESSAGE =
  'Not grounding-checked. Run a grounding check from the Agent loop.';
const CHANGED_MESSAGE =
  'Changed since grounding check. Run a grounding check from the Agent loop.';
const UNSUPPORTED_MESSAGE = 'Claim not supported by the sources.';
const WEAK_MESSAGE = 'Claim only weakly supported by the sources.';

// The claims artefact of a file, or undefined when it is missing, not JSON or not the current schema (P3).
function artefactOf(text: string | undefined): GroundingResult | undefined {
  if (text === undefined) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  const parsed = groundingResultSchema.safeParse(data);
  return parsed.success ? parsed.data : undefined;
}

// The position of a claim (P4): its span in the current text when the span is in range, else line 1.
function claimPosition(
  file: PreflightFile,
  span: { start: number; end: number },
): Pick<Finding, 'line' | 'offset' | 'length'> {
  const { start, end } = span;
  if (0 <= start && start <= end && end <= file.content.length) {
    return {
      line: lineOf(file.content, start),
      offset: start,
      length: end - start,
    };
  }
  return { line: 1 };
}

// Unsupported claims are errors, weak claims warnings; file-level infos sit at line 1 (P5, P6, P7, P9).
export const unsupportedClaimsCheck: PreflightRunner = {
  id: 'unsupported-claims',
  run(input: PreflightInput) {
    const findings: Finding[] = [];
    for (const file of input.files) {
      const artefact = artefactOf(
        input.readText(
          `${GROUNDING_ARTEFACT_PATH_PREFIX}${file.path}${GROUNDING_ARTEFACT_PATH_SUFFIX}`,
        ),
      );
      if (artefact === undefined) {
        findings.push({
          severity: 'info',
          path: file.path,
          line: 1,
          message: NOT_CHECKED_MESSAGE,
        });
        continue;
      }
      if (artefact.contentHash !== file.hash) {
        findings.push({
          severity: 'info',
          path: file.path,
          line: 1,
          message: CHANGED_MESSAGE,
        });
      }
      for (const claim of artefact.claims) {
        if (claim.verdict === 'supported') continue;
        findings.push({
          severity: claim.verdict === 'unsupported' ? 'error' : 'warning',
          path: file.path,
          ...claimPosition(file, claim.span),
          message:
            claim.verdict === 'unsupported'
              ? UNSUPPORTED_MESSAGE
              : WEAK_MESSAGE,
          ref: {
            text: claim.text,
            ...(claim.passage === undefined ? {} : { passage: claim.passage }),
          },
        });
      }
    }
    return findings;
  },
};

const ORPHAN_SCENE_MESSAGE =
  'Scene or beat path names no manuscript file in drafts/.';
const ORPHAN_ENTRY_MESSAGE = 'Order entry names no manuscript file.';
const OFF_GRAPH_MESSAGE = 'Body file is not on the story graph.';

// The start offset of a parsed node, or undefined when it has no position.
function startOf(node: unknown): number | undefined {
  if (typeof node !== 'object' || node === null || !('range' in node)) {
    return undefined;
  }
  const range = node.range;
  if (!Array.isArray(range) || typeof range[0] !== 'number') return undefined;
  return range[0];
}

// The one-based line of item `index` of the list `key` (P10). YAML and JSON are both read as YAML, so one reader
// serves the graph files and project.yaml. It is 1 when the text is missing, has errors or the item has no position.
function itemLine(
  text: string | undefined,
  key: string,
  index: number,
): number {
  if (text === undefined) return 1;
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });
  if (doc.errors.length > 0) return 1;
  const start = startOf(doc.getIn([key, index], true));
  if (start === undefined) return 1;
  return lineCounter.linePos(start).line;
}

// The line of the first order entry of project.yaml whose path is `path` (P12); 1 when none is found.
function staleLine(text: string | undefined, path: string): number {
  if (text === undefined) return 1;
  const doc = parseDocument(text);
  if (doc.errors.length > 0) return 1;
  const data: unknown = doc.toJS();
  const order =
    typeof data === 'object' && data !== null && 'order' in data
      ? data.order
      : undefined;
  if (!Array.isArray(order)) return 1;
  const index = order.findIndex(
    (entry: unknown) =>
      typeof entry === 'object' &&
      entry !== null &&
      'path' in entry &&
      entry.path === path,
  );
  return index < 0 ? 1 : itemLine(text, 'order', index);
}

// Orphan scenes (P11 to P14): (a) a scene or beat path naming no current manuscript file, at its node, (b) a stale
// order entry, at its entry in project.yaml, (c) a body file no story node points at, only with a story graph.
export const orphanScenesCheck: PreflightRunner = {
  id: 'orphan-scenes',
  run(input: PreflightInput) {
    const findings: Finding[] = [];
    const members = new Set(input.view.entries.map((entry) => entry.path));

    for (const { path: graphPath, graph } of input.storyGraphs) {
      const text = input.readText(graphPath);
      graph.nodes.forEach((node, index) => {
        if (node.kind !== 'scene' && node.kind !== 'beat') return;
        if (node.path === undefined || members.has(node.path)) return;
        findings.push({
          severity: 'warning',
          path: graphPath,
          line: itemLine(text, 'nodes', index),
          message: ORPHAN_SCENE_MESSAGE,
          ref: { node: node.id, path: node.path },
        });
      });
    }

    const projectText = input.readText('project.yaml');
    for (const warning of input.view.warnings) {
      if (warning.kind !== 'staleEntry') continue;
      findings.push({
        severity: 'warning',
        path: 'project.yaml',
        line: staleLine(projectText, warning.path),
        message: ORPHAN_ENTRY_MESSAGE,
        ref: { path: warning.path },
      });
    }

    if (input.storyGraphs.length > 0) {
      const pointed = new Set<string>();
      for (const { graph } of input.storyGraphs) {
        for (const node of graph.nodes) {
          if (node.path !== undefined) pointed.add(node.path);
        }
      }
      for (const entry of input.view.entries) {
        if (entry.part !== 'body' || pointed.has(entry.path)) continue;
        findings.push({
          severity: 'info',
          path: entry.path,
          line: 1,
          message: OFF_GRAPH_MESSAGE,
        });
      }
    }
    return findings;
  },
};
