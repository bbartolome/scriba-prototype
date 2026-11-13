import { z } from 'zod';

// Defaults for a new provider. The UI and the seeding use these values.
export const PROVIDER_DEFAULTS = {
  temperature: 0.7,
  contextSize: 64000,
  maxTokens: 4096,
  timeout: 120000,
  retries: 2,
} as const;

// A preset is a starting point for a new provider. `keyRequired` says whether the preset needs a key.
export const presetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  baseURL: z.url(),
  keyRequired: z.boolean(),
  hints: z.array(z.string()),
});

export const presetListSchema = z.object({
  presets: z.array(presetSchema),
});

// The four presets, in unit order. Ollama is first.
export const PROVIDER_PRESETS: Preset[] = [
  {
    id: 'ollama',
    label: 'Ollama',
    baseURL: 'http://host.docker.internal:11434/v1',
    keyRequired: false,
    hints: [
      'Context length is set in Ollama, not in Scriba.',
      'Pull a model on the host with `ollama pull <model>`.',
    ],
  },
  {
    id: 'lm-studio',
    label: 'LM Studio',
    baseURL: 'http://host.docker.internal:1234/v1',
    keyRequired: false,
    hints: ['Start the local server and load a model in LM Studio.'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    keyRequired: true,
    hints: [],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    keyRequired: true,
    hints: [],
  },
];

export type Preset = z.infer<typeof presetSchema>;
export type PresetList = z.infer<typeof presetListSchema>;
