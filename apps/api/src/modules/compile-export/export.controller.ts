import { createReadStream } from 'node:fs';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  EXPORT_DOWNLOAD_ROUTE,
  EXPORT_ROUTE,
  exportFormatSchema,
  exportRequestSchema,
  type ExportFormat,
  type ExportRequest,
  type ExportResult,
} from '@bbartolome/scriba-contracts/compile-export';
import { ZodValidationPipe } from '../platform/platform.module';
import { ExportService } from './export.service';

// The export routes, behind Setup & auth's guard. The POST runs an export; the GET streams its file and writes
// nothing (P1, P2).
@Controller()
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  @Post(EXPORT_ROUTE)
  @HttpCode(200)
  export(
    @Body(new ZodValidationPipe(exportRequestSchema)) body: ExportRequest,
  ): Promise<ExportResult> {
    return this.exports.export(body.format);
  }

  @Get(EXPORT_DOWNLOAD_ROUTE)
  download(
    @Param('format', new ZodValidationPipe(exportFormatSchema))
    format: ExportFormat,
  ): StreamableFile {
    const file = this.exports.download(format);
    return new StreamableFile(createReadStream(file.path), {
      type: file.type,
      disposition: `attachment; filename=${file.fileName}`,
      length: file.bytes,
    });
  }
}
