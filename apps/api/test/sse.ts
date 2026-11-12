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
