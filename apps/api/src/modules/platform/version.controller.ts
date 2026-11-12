import { Controller, Get } from '@nestjs/common';
import {
  VERSION_ROUTE,
  type VersionInfo,
} from '@bbartolome/scriba-contracts/platform';
import { BUILD_INFO } from './build-info';
import { EXPECTED_COMPOSE_VERSION } from './compose-version';

@Controller()
export class VersionController {
  @Get(VERSION_ROUTE)
  version(): VersionInfo {
    return {
      version: BUILD_INFO.version,
      revision: BUILD_INFO.revision,
      builtAt: BUILD_INFO.builtAt,
      composeVersion: EXPECTED_COMPOSE_VERSION,
    };
  }
}
