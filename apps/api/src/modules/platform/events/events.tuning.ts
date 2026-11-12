// Injection token for the per-stream write limit. A test module can provide a lower value.
export const WRITE_BUFFER_LIMIT_BYTES = Symbol('WRITE_BUFFER_LIMIT_BYTES');

// A stream whose unsent bytes pass this limit is closed. The unit names no number, so this one is chosen.
export const DEFAULT_WRITE_BUFFER_LIMIT_BYTES = 1048576;
