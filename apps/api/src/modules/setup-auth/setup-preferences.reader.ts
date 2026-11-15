import { Injectable } from '@nestjs/common';
import type { Preferences } from '@bbartolome/scriba-contracts/setup-auth';
import { SetupStatusService } from './setup-status.service';

// Read-only access to the stored preferences, in process, for other modules. It has no HTTP route and no write method.
// An empty string is a stored value; the consumer treats it as unset.
@Injectable()
export class PreferencesReader {
  constructor(private readonly status: SetupStatusService) {}

  // The stored authorName and defaultGenrePack, or {} when none are stored.
  read(): Preferences {
    return this.status.preferences();
  }
}
