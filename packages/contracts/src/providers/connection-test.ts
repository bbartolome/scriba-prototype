import { z } from 'zod';
import { providerConfigInputSchema } from './config.js';
import { providerErrorCodeSchema } from './errors.js';

// The three stages of a connection test, in order.
export const CONNECTION_TEST_STAGES = ['reach', 'list', 'chat'] as const;

export const connectionTestStageSchema = z.enum(CONNECTION_TEST_STAGES);

// The error of a failed test. The code is a PROVIDER code.
export const connectionTestErrorSchema = z.object({
  code: providerErrorCodeSchema,
  message: z.string(),
  hint: z.string().optional(),
});

// Test a stored provider by id, or test a draft config. `key` is test-only and is never stored.
// Strict objects make the two forms exclusive.
export const connectionTestRequestSchema = z.union([
  z.strictObject({
    providerId: z.string().min(1),
    key: z.string().optional(),
  }),
  z.strictObject({
    draft: providerConfigInputSchema,
    key: z.string().optional(),
  }),
]);

export const connectionTestResultSchema = z.object({
  ok: z.boolean(),
  stage: connectionTestStageSchema,
  latencyMs: z.number().min(0),
  modelCount: z.number().int().min(0).optional(),
  error: connectionTestErrorSchema.optional(),
});

export type ConnectionTestStage = z.infer<typeof connectionTestStageSchema>;
export type ConnectionTestError = z.infer<typeof connectionTestErrorSchema>;
export type ConnectionTestRequest = z.infer<typeof connectionTestRequestSchema>;
export type ConnectionTestResult = z.infer<typeof connectionTestResultSchema>;
