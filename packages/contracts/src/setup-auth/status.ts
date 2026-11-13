import { z } from 'zod';

// The five setup steps, in wizard order. Each step is in one of the three states.
export const SETUP_STEP_KEYS = [
  'access',
  'tailscale',
  'providers',
  'preferences',
  'firstProject',
] as const;

export const SETUP_STEP_STATES = ['pending', 'done', 'skipped'] as const;

export const setupStepKeySchema = z.enum(SETUP_STEP_KEYS);
export const setupStepStateSchema = z.enum(SETUP_STEP_STATES);

export const setupStepsSchema = z.object({
  access: setupStepStateSchema,
  tailscale: setupStepStateSchema,
  providers: setupStepStateSchema,
  preferences: setupStepStateSchema,
  firstProject: setupStepStateSchema,
});

// Compose version check. `expected` is the compose version this image needs.
// `actual` is absent when SCRIBA_COMPOSE_VERSION is unset, which reports `unknown`.
export const composeVersionStatusSchema = z.object({
  state: z.enum(['ok', 'mismatch', 'unknown']),
  expected: z.number().int(),
  actual: z.number().int().optional(),
});

// Response of GET /api/setup-auth/status. `compose` lets the Shell show a global banner.
export const setupStatusSchema = z.object({
  steps: setupStepsSchema,
  complete: z.boolean(),
  compose: composeVersionStatusSchema,
});

// Body of a step update. The step key is in the path, not in the body.
export const stepUpdateSchema = z.object({
  state: z.enum(['done', 'skipped']),
});

export type SetupStep = z.infer<typeof setupStepKeySchema>;
export type SetupStepState = z.infer<typeof setupStepStateSchema>;
export type ComposeVersionStatus = z.infer<typeof composeVersionStatusSchema>;
export type SetupStatus = z.infer<typeof setupStatusSchema>;
export type StepUpdate = z.infer<typeof stepUpdateSchema>;
