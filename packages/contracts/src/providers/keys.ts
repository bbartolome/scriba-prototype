import { z } from 'zod';

// Write-only key requests. No response carries a key. The read view shows keySet and a masked hint.
export const keySetRequestSchema = z.object({
  providerId: z.string().min(1),
  key: z.string().min(1),
});

export const keyClearRequestSchema = z.object({
  providerId: z.string().min(1),
});

export type KeySetRequest = z.infer<typeof keySetRequestSchema>;
export type KeyClearRequest = z.infer<typeof keyClearRequestSchema>;
