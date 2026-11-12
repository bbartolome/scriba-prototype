import { startMockOpenAI } from './server.mjs';

const server = await startMockOpenAI();
console.log(`mock OpenAI base URL: ${server.baseUrl}`);
console.log(`scenario URL example: ${server.baseUrl}/scenario/tool-call/v1`);

async function shutdown() {
  await server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
