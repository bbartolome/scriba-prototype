import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  SETUP_AUTH_ERROR_CODES,
  SETUP_AUTH_ERROR_STATUS,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  type Identity,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ModuleError } from '../platform/platform.module';
import { RequestIdentity } from './request-identity';
import { SetupStatusService } from './setup-status.service';

// The setup status (GET) and Continue (POST). Both need an identity from the guard: a loopback cookie or a tailnet login.
@Controller()
export class SetupStatusController {
  constructor(private readonly status: SetupStatusService) {}

  @Get(SETUP_STATUS_ROUTE)
  getStatus(@RequestIdentity() identity: Identity | undefined): SetupStatus {
    this.requireSession(identity);
    return this.status.status();
  }

  // Marks the remaining steps skipped and sets complete. Answers 200 with the status body.
  @Post(SETUP_CONTINUE_ROUTE)
  @HttpCode(200)
  continueSetup(
    @RequestIdentity() identity: Identity | undefined,
  ): SetupStatus {
    this.requireSession(identity);
    return this.status.continueSetup();
  }

  // Without an identity the answer is 401 AUTH_REQUIRED. The check is made here as well as in the guard.
  private requireSession(identity: Identity | undefined): void {
    if (identity === undefined) {
      throw new ModuleError(
        SETUP_AUTH_ERROR_CODES.REQUIRED,
        SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED,
        'Not signed in.',
      );
    }
  }
}
