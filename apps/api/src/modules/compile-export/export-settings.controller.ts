import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  copyDefaultRequestSchema,
  EXPORT_COPY_DEFAULT_ROUTE,
  EXPORT_SETTINGS_ROUTE,
  exportSettingsWriteSchema,
  type CopyDefaultRequest,
  type ExportSettingsView,
  type ExportSettingsWrite,
} from '@bbartolome/scriba-contracts/compile-export';
import type { FileWriteResult } from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { ExportService } from './export.service';
import { ExportSettingsService } from './export-settings.service';

// The export settings routes and the copy-default route, behind Setup & auth's guard. The GET never mutates; each
// POST is checked by its contract schema (U5, D8).
@Controller()
export class ExportSettingsController {
  constructor(
    private readonly settings: ExportSettingsService,
    private readonly exports: ExportService,
  ) {}

  @Get(EXPORT_SETTINGS_ROUTE)
  view(): ExportSettingsView {
    return this.settings.view();
  }

  @Post(EXPORT_SETTINGS_ROUTE)
  @HttpCode(200)
  write(
    @Body(new ZodValidationPipe(exportSettingsWriteSchema))
    body: ExportSettingsWrite,
  ): ExportSettingsView {
    return this.settings.write(body);
  }

  @Post(EXPORT_COPY_DEFAULT_ROUTE)
  @HttpCode(200)
  copyDefault(
    @Body(new ZodValidationPipe(copyDefaultRequestSchema))
    body: CopyDefaultRequest,
  ): FileWriteResult {
    return this.exports.copyDefault(body);
  }
}
