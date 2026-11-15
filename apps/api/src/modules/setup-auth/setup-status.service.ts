import { Inject, Injectable } from '@nestjs/common';
import {
  SETUP_STEP_KEYS,
  setupAuthSectionSchema,
  type Preferences,
  type SetupAuthSection,
  type SetupStatus,
  type SetupStep,
  type SetupStepState,
} from '@bbartolome/scriba-contracts/setup-auth';
import {
  EXPECTED_COMPOSE_VERSION,
  SCRIBA_ENV,
  SettingsService,
  type ScribaEnv,
  type SettingsSection,
} from '../platform/platform.module';
import { SETUP_AUTH_SECTION_DEF } from './setup-auth.section';
import { composeVersionStatus } from './compose-status';

type Steps = SetupAuthSection['steps'];

// The body of the status route. A pending access is shown as done, because only an authenticated caller gets this
// body. A stored access that is done or skipped is shown as stored, so a skipped access is visible.
// The compose state is the compose-version check of compose-status.ts, passed in by each caller.
function statusBody(
  steps: Steps,
  complete: boolean,
  compose: SetupStatus['compose'],
): SetupStatus {
  const access = steps.access === 'pending' ? 'done' : steps.access;
  return {
    steps: { ...steps, access },
    complete,
    compose,
  };
}

// The steps after Continue: access is done, and every step still pending is skipped.
function continuedSteps(steps: Steps): Steps {
  const next: Steps = { ...steps, access: 'done' };
  for (const key of SETUP_STEP_KEYS) {
    if (next[key] === 'pending') next[key] = 'skipped';
  }
  return next;
}

// Reads the setupAuth section for the status route, and reads and writes it for Continue.
@Injectable()
export class SetupStatusService {
  constructor(
    private readonly settings: SettingsService,
    @Inject(SCRIBA_ENV) private readonly env: ScribaEnv,
  ) {}

  // Reads only: nothing is written and no cookie is set.
  status(): SetupStatus {
    const section = this.parsed(this.stored());
    return statusBody(
      section.steps,
      section.complete,
      composeVersionStatus(
        this.env.SCRIBA_COMPOSE_VERSION,
        EXPECTED_COMPOSE_VERSION,
      ),
    );
  }

  // Writes the setupAuth section only. The write is a merge: steps and complete change, and every other key is kept.
  continueSetup(): SetupStatus {
    const stored = this.stored();
    const steps = continuedSteps(this.parsed(stored).steps);
    this.settings.write('setupAuth', { ...stored, steps, complete: true });
    return statusBody(
      steps,
      true,
      composeVersionStatus(
        this.env.SCRIBA_COMPOSE_VERSION,
        EXPECTED_COMPOSE_VERSION,
      ),
    );
  }

  // Sets one step's state and nothing else. complete is not written here: only Continue writes it.
  setStep(key: SetupStep, state: SetupStepState): SetupStatus {
    const stored = this.stored();
    const section = this.parsed(stored);
    const steps: Steps = { ...section.steps, [key]: state };
    this.settings.write('setupAuth', { ...stored, steps });
    return statusBody(
      steps,
      section.complete,
      composeVersionStatus(
        this.env.SCRIBA_COMPOSE_VERSION,
        EXPECTED_COMPOSE_VERSION,
      ),
    );
  }

  // Reads only. The stored preferences, or {} when none are stored.
  preferences(): Preferences {
    return this.parsed(this.stored()).preferences;
  }

  // Merges the fields of the patch into the stored preferences. A field absent from the patch keeps its stored
  // value, and a key the stored object holds beyond the schema is kept as it is. Writes the setupAuth section only.
  savePreferences(patch: Preferences): Preferences {
    const stored = this.stored();
    this.parsed(stored);
    const next = {
      ...stored,
      preferences: {
        ...(stored.preferences as Record<string, unknown>),
        ...patch,
      },
    };
    const saved = this.parsed(next).preferences;
    this.settings.write('setupAuth', next);
    return saved;
  }

  // The stored section, or the module default when the section is missing from the file.
  // The default is never null (setup-auth.section.ts), so the cast is safe.
  private stored(): SettingsSection {
    return (
      this.settings.read('setupAuth') ??
      (SETUP_AUTH_SECTION_DEF.defaultValue as SettingsSection)
    );
  }

  // A stored section that does not match the schema is a server fault. It is a plain Error (500), not a ZodError (400).
  private parsed(section: SettingsSection): SetupAuthSection {
    const result = setupAuthSectionSchema.safeParse(section);
    if (!result.success) {
      throw new Error(
        'The setupAuth section of settings.yaml does not match its schema.',
      );
    }
    return result.data;
  }
}
