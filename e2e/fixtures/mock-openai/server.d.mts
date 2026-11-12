export interface MockOpenAIOptions {
  scenariosDir?: string;
}

export interface MockOpenAIRecord {
  attempt: number;
  endpoint: 'chat' | 'models';
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  step: number | null;
  closedByClient: boolean;
}

export interface MockOpenAI {
  baseUrl: string;
  close(): Promise<void>;
}

export declare function startMockOpenAI(
  options?: MockOpenAIOptions,
): Promise<MockOpenAI>;
