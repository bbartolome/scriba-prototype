// Injection token for the Pandoc runner's limits. A test module can provide other values.
export const PANDOC_TUNING = Symbol('PANDOC_TUNING');

// The limits of one Pandoc run. The unit names a 120 s default timeout and an output cap but no number for the cap,
// so the cap is chosen here: 100 MiB. The stderr tail keeps the last 4 KiB.
export interface PandocTuning {
  command: string;
  timeoutMs: number;
  stderrMaxBytes: number;
  outputMaxBytes: number;
}

export const DEFAULT_PANDOC_TUNING: PandocTuning = {
  command: 'pandoc',
  timeoutMs: 120000,
  stderrMaxBytes: 4096,
  outputMaxBytes: 104857600,
};
