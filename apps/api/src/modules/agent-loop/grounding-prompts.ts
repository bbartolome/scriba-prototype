import { z } from 'zod';
import { groundingVerdictSchema } from '@bbartolome/scriba-contracts/agent-loop';

// The fixed prompts, markers, texts, limits and reply schemas of the grounding engine. The mock scripts of the
// tests match these exact strings.

// The first line of the user message of each model request. The mock matches on it.
export const EXTRACT_MARKER = 'Task: extract claims.';
export const JUDGE_MARKER = 'Task: judge claims.';

// The passages the judge sees per claim (the search default of 20 would make the judge prompt long).
export const RETRIEVAL_LIMIT = 5;
// The claims per judge call.
export const JUDGE_BATCH_SIZE = 10;
// One try and two retries, for the extract and for the judge.
export const MODEL_ATTEMPTS = 3;

export const EXTRACT_FAILED_MESSAGE =
  'The claims of the draft could not be read. The model gave no valid claim list after three attempts.';
export const JUDGE_FAILED_MESSAGE =
  'The verdicts on the claims could not be read. The model gave no valid verdict list after three attempts.';
export const NO_PASSAGE_REASON = 'No passage of sources/ matches this claim.';
export const UNCITED_REASON =
  'The verdict cited no passage retrieved for this claim, so it is unsupported.';

export const EXTRACT_SYSTEM_PROMPT =
  'You extract the factual claims of a text. A factual claim states something a source could confirm or contradict: a number, a date, a named event, a cause or an effect. Leave out opinions and questions. Reply with JSON only, in this form: {"claims": [{"text": "<the claim, copied from the text>", "span": {"start": <character offset where the claim starts in the text>, "end": <character offset where it ends>}}]}. Reply with {"claims": []} when the text has no factual claim. Reply with nothing but the JSON.';

export const JUDGE_SYSTEM_PROMPT =
  'You judge each numbered claim against the passages listed under it. Give each claim one verdict: "supported" when a passage confirms the claim, "weak" when a passage confirms it only in part or indirectly, "unsupported" when no passage confirms it. For "supported" and "weak", name one passage by its path and offset, copied exactly from the list. For "unsupported", use null for the passage. Reply with JSON only, in this form: {"verdicts": [{"claim": <claim number>, "verdict": "supported" | "weak" | "unsupported", "passage": {"path": "<path>", "offset": <offset>} | null, "reason": "<one short sentence>"}]}. Give exactly one verdict for each claim you were given. Reply with nothing but the JSON.';

export const extractReplySchema = z.object({
  claims: z.array(
    z.object({
      text: z.string().min(1),
      span: z.object({
        start: z.number().int().min(0),
        end: z.number().int().min(0),
      }),
    }),
  ),
});

export const judgeReplySchema = z.object({
  verdicts: z.array(
    z.object({
      claim: z.number().int().min(0),
      verdict: groundingVerdictSchema,
      passage: z
        .object({ path: z.string().min(1), offset: z.number().int().min(0) })
        .nullish(),
      reason: z.string(),
    }),
  ),
});
