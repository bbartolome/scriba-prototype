import { Injectable } from '@nestjs/common';
import {
  SETUP_STEP_KEYS,
  setupAuthSectionSchema,
  type SetupAuthSection,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import {
  EXPECTED_COMPOSE_VERSION,
  SettingsService,
  type SettingsSection,
} from '../platform/platform.module';
import { SETUP_AUTH_SECTION_DEF } from './setup-auth.section';

type Steps = SetupAuthSection['steps'];

// The body of the status route. Access is done because only an authenticated caller gets this body.
// The compose state is unknown until the compose-version check (SAU-10) reports it.
function statusBody(steps: Steps, complete: boolean): SetupStatus {
  return {
    steps: { ...steps, access: 'done' },
    complete,
    compose: { state: 'unknown', expected: EXPECTED_COMPOSE_VERSION },
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
  constructor(private readonly settings: SettingsService) {}

  // Reads only: nothing is written and no cookie is set.
  status(): SetupStatus {
    const section = this.parsed(this.stored());
    return statusBody(section.steps, section.complete);
  }

  // Writes the setupAuth section only. The write is a merge: steps and complete change, and every other key is kept.
  continueSetup(): SetupStatus {
    const stored = this.stored();
    const steps = continuedSteps(this.parsed(stored).steps);
    this.settings.write('setupAuth', { ...stored, steps, complete: true });
    return statusBody(steps, true);
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
