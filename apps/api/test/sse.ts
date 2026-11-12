// Thin fetch reader for the SSE stream. Yields each text chunk of the response body as it arrives.
export async function* readSse(
  url: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch(url, {
    headers: { accept: 'text/event-stream' },
    signal,
  });
  if (!response.body) throw new Error(`no response body from ${url}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    await reader.cancel();
  }
}

export interface OpenSse {
  response: Response;
  next: (timeoutMs: number) => Promise<string>; // the next block; rejects on timeout
  cancel: () => Promise<void>;
}

// Opens a stream and hands out its blocks one at a time. A block is the text up to a blank line,
// without that blank line. One pending read is kept across timeouts, so no chunk is lost.
export async function openSse(
  url: string,
  headers: Record<string, string> = {},
): Promise<OpenSse> {
  const response = await fetch(url, {
    headers: { accept: 'text/event-stream', ...headers },
  });
  if (!response.body) throw new Error(`no response body from ${url}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let pending: Promise<ReadableStreamReadResult<string>> | undefined;
  return {
    response,
    next: async (timeoutMs) => {
      for (;;) {
        const end = buffer.indexOf('\n\n');
        if (end !== -1) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          return block;
        }
        pending ??= reader.read();
        const { value, done } = await withTimeout(pending, timeoutMs);
        pending = undefined;
        if (done) throw new Error(`stream from ${url} ended`);
        buffer += value;
      }
    },
    cancel: async () => {
      await reader.cancel().catch(() => undefined);
    },
  };
}

// The JSON text of a block's `data:` line. Throws for a block with no data line (a comment).
export function dataOf(block: string): string {
  const line = block.split('\n').find((text) => text.startsWith('data: '));
  if (line === undefined)
    throw new Error(`no data line in ${JSON.stringify(block)}`);
  return line.slice('data: '.length);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`no SSE block within ${ms} ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
