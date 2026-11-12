import { Controller, Get } from '@nestjs/common';
import {
  HEALTHZ_ROUTE,
  type Healthz,
} from '@bbartolome/scriba-contracts/platform';
import { BUILD_INFO } from './build-info';

// Unguarded on purpose: the compose healthcheck and the image smoke run before setup.
@Controller()
export class HealthController {
  @Get(HEALTHZ_ROUTE)
  healthz(): Healthz {
    return { status: 'ok', version: BUILD_INFO.version };
  }
}
