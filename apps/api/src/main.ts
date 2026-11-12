import { bootstrap } from './bootstrap';
import { BootError } from './modules/platform/boot/boot-error';

async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    app.enableShutdownHooks([], { useProcessExit: true });
    await app.listen(8080, '0.0.0.0');
  } catch (error) {
    if (error instanceof BootError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

void main();
