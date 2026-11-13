import { Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import {
  SETUP_AUTH_ERROR_CODES,
  SETUP_AUTH_ERROR_STATUS,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ModuleError } from '../platform/platform.module';
import { SetupCookieSigner } from './setup-cookie.signer';
import { cookieValue } from './setup-session.cookie';
import { SetupStatusService } from './setup-status.service';

// The setup status (GET) and Continue (POST). Both need the setup session cookie.
@Controller()
export class SetupStatusController {
  constructor(
    private readonly signer: SetupCookieSigner,
    private readonly status: SetupStatusService,
  ) {}

  @Get(SETUP_STATUS_ROUTE)
  getStatus(@Headers('cookie') cookie: string | undefined): SetupStatus {
    this.requireSession(cookie);
    return this.status.status();
  }

  // Marks the remaining steps skipped and sets complete. Answers 200 with the status body.
  @Post(SETUP_CONTINUE_ROUTE)
  @HttpCode(200)
  continueSetup(@Headers('cookie') cookie: string | undefined): SetupStatus {
    this.requireSession(cookie);
    return this.status.continueSetup();
  }

  // Without a cookie that verifies, the answer is 401 AUTH_REQUIRED. The check is made here as well as in the guard.
  private requireSession(cookie: string | undefined): void {
    const value = cookieValue(cookie, this.signer.cookieName());
    if (this.signer.verify(value) === undefined) {
      throw new ModuleError(
        SETUP_AUTH_ERROR_CODES.REQUIRED,
        SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED,
        'Not signed in.',
      );
    }
  }
}
