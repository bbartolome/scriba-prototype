import {
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  groundingResultSchema,
  type GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { PreflightFinding } from '@bbartolome/scriba-contracts/compile-export';
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
