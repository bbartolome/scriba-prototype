import { Injectable } from '@nestjs/common';
import {
  TOOLS_SECTION_SCHEMA_VERSION,
  toolsSectionSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { SettingsService } from '../platform/platform.module';

// The author's switch overrides, keyed by tool name. Only overridden tools appear.
export type ToolSwitches = Record<string, boolean>;

// Reads and writes the enable overrides in the tools section of settings.yaml. Nothing is cached: each read sees the
// file as it is now, so an enable change applies from the next call.
@Injectable()
export class ToolSwitchesService {
  constructor(private readonly settings: SettingsService) {}

  // The overrides. An absent or malformed section has none.
  overrides(): ToolSwitches {
    const parsed = toolsSectionSchema.safeParse(this.settings.read('tools'));
    return parsed.success ? parsed.data.enabled : {};
  }

  // Writes the overrides. Every other key of the section is kept.
  save(enabled: ToolSwitches): void {
    const stored = this.settings.read('tools') ?? {};
    this.settings.write('tools', {
      ...stored,
      schemaVersion: TOOLS_SECTION_SCHEMA_VERSION,
      enabled,
    });
  }
}
