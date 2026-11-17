import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ALLOWLIST_ROUTE,
  PREFERENCES_ROUTE,
  SETUP_STEP_ROUTE,
  allowlistUpdateSchema,
  preferencesSchema,
  setupStepKeySchema,
  stepUpdateSchema,
  type Allowlist,
  type Identity,
  type Preferences,
  type SetupStatus,
  type SetupStep,
  type StepUpdate,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ZodValidationPipe } from '../platform/platform.module';
import { RequestIdentity } from './request-identity';
import { SetupStatusService } from './setup-status.service';

// The setup steps (POST), the preferences (GET and POST) and the owner allowlist (GET and POST). The global guard covers
// every route here: it needs the setup cookie, and the Origin of a mutation. So no cookie check is repeated in this controller.
@Controller()
export class SetupFlowController {
  constructor(private readonly status: SetupStatusService) {}

  @Get(ALLOWLIST_ROUTE)
  allowlist(): Allowlist {
    return this.status.allowlist();
  }

  // A field-level merge: only the fields in the body change. Answers 200 with the saved allowlist.
  @Post(ALLOWLIST_ROUTE)
  @HttpCode(200)
  async saveAllowlist(
    @Body(new ZodValidationPipe(allowlistUpdateSchema))
    body: Partial<Allowlist>,
    @RequestIdentity() identity: Identity | undefined,
  ): Promise<Allowlist> {
    return this.status.saveAllowlist(body, identity);
  }

  @Get(PREFERENCES_ROUTE)
  preferences(): Preferences {
    return this.status.preferences();
  }

  // A field-level merge: only the fields in the body change. Answers 200 with the merged preferences.
  @Post(PREFERENCES_ROUTE)
  @HttpCode(200)
  savePreferences(
    @Body(new ZodValidationPipe(preferencesSchema)) body: Preferences,
  ): Preferences {
    return this.status.savePreferences(body);
  }

  // Sets one step to done or skipped. The step key is in the path. Answers 200 with the status body.
  @Post(SETUP_STEP_ROUTE)
  @HttpCode(200)
  setStep(
    @Param('step', new ZodValidationPipe(setupStepKeySchema)) step: SetupStep,
    @Body(new ZodValidationPipe(stepUpdateSchema)) body: StepUpdate,
  ): SetupStatus {
    return this.status.setStep(step, body.state);
  }
}
