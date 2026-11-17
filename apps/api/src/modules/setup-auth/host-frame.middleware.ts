import { HEALTHZ_ROUTE } from '@bbartolome/scriba-contracts/platform';
import {
  SETUP_AUTH_ERROR_CODES,
  SETUP_AUTH_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/setup-auth';
import { requestPath, type RequestPolicy } from './request-policy';

// The parts of the request and response that the hook reads and writes. apps/api has no @types/express.
interface HookRequest {
  originalUrl: string;
  headers: { host?: string };
}

interface HookResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
}

// Anti-framing on every response the hook sees. Node keeps this header when a later writeHead sends the status.
const FRAME_POLICY = "frame-ancestors 'none'";

// Registered with app.use before init(), so it runs before the body parser and the static files.
// Every path but /healthz needs an allowed Host. A refused request gets Platform's base error shape.
export function hostFrameMiddleware(policy: RequestPolicy) {
  return async (
    req: HookRequest,
    res: HookResponse,
    next: (error?: unknown) => void,
  ): Promise<void> => {
    res.setHeader('Content-Security-Policy', FRAME_POLICY);
    const exempt = requestPath(req.originalUrl) === HEALTHZ_ROUTE;
    if (!exempt && (await policy.admit(req.headers.host)) === undefined) {
      res.statusCode = SETUP_AUTH_ERROR_STATUS.AUTH_HOST_REJECTED;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: {
            code: SETUP_AUTH_ERROR_CODES.HOST_REJECTED,
            message: 'The Host header is not allowed.',
          },
        }),
      );
      return;
    }
    next();
  };
}
