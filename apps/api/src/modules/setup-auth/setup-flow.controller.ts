import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  PREFERENCES_ROUTE,
  SETUP_STEP_ROUTE,
  preferencesSchema,
  setupStepKeySchema,
  stepUpdateSchema,
  type Preferences,
  type SetupStatus,
  type SetupStep,
  type StepUpdate,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ZodValidationPipe } from '../platform/platform.module';
import { SetupStatusService } from './setup-status.service';

// The setup steps (POST) and the preferences (GET and POST). The global guard covers every route here: it needs the
// setup cookie, and the Origin of a mutation. So no cookie check is repeated in this controller.
@Controller()
export class SetupFlowController {
  constructor(private readonly status: SetupStatusService) {}

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
