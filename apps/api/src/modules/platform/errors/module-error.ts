// A module's own error. The filter returns it unchanged in the base shape, with this status and code.
export class ModuleError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: string,
    status: number,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
