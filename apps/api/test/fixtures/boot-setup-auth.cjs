'use strict';
// Test-only child for the setup-auth tests. It calls the built bootstrap() with the composed modules,
// then closes the app. It mirrors the BootError branch of src/main.ts: write the message to stderr and exit 1.
// Exits run from the stream callback, so output written before the exit is not cut off.
const { join, resolve } = require('node:path');

const DIST = resolve(__dirname, '..', '..', 'dist');
const { bootstrap } = require(join(DIST, 'bootstrap.js'));
const { BootError } = require(
  join(DIST, 'modules/platform/boot/boot-error.js'),
);

const STATIC_ROOT = resolve(__dirname, 'static');

async function main() {
  let app;
  try {
    app = await bootstrap({ staticRoot: STATIC_ROOT });
  } catch (error) {
    if (error instanceof BootError) {
      process.stderr.write(`${error.message}\n`, () => process.exit(1));
      return;
    }
    throw error;
  }
  await app.close();
  process.stdout.write('', () => process.exit(0));
}

void main();
