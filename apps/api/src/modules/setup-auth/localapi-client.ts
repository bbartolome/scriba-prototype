import { Inject, Injectable } from '@nestjs/common';
import { request } from 'node:http';
import { SCRIBA_ENV, type ScribaEnv } from '../platform/platform.module';

const STATUS_PATH = '/localapi/v0/status';
const TIMEOUT_MS = 2000;

// The one read of the tailscaled LocalAPI. It sends GET only: the app reads status and never writes it.
@Injectable()
export class LocalApiClient {
  constructor(@Inject(SCRIBA_ENV) private readonly env: ScribaEnv) {}

  // Resolves with the parsed JSON body of a 200 answer. Rejects on any other outcome.
  status(): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const req = request({
        socketPath: this.env.SCRIBA_TS_SOCKET,
        path: STATUS_PATH,
        method: 'GET',
        headers: { Host: 'local-tailscaled.sock' },
        agent: false,
      });
      req.setTimeout(TIMEOUT_MS, () => {
        req.destroy(new Error('LocalAPI status timed out'));
      });
      req.on('error', reject);
      req.on('response', (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          if (response.statusCode !== 200) {
            reject(new Error(`LocalAPI answered ${response.statusCode}`));
            return;
          }
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(text) as unknown);
          } catch (error) {
            reject(error);
          }
        });
      });
      req.end();
    });
  }
}
