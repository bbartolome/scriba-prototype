// A boot failure with a message meant for the operator. main.ts prints the message and exits 1.
export class BootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BootError';
  }
}
