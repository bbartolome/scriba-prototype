import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  TOOL_ROUTE,
  TOOL_VALIDATE_ROUTE,
  toolValidateRequestSchema,
  type ToolDetail,
  type ToolValidateRequest,
  type ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ZodValidationPipe } from '../platform/platform.module';
import { CatalogService } from './catalog.service';

// The tool read and validate HTTP API, behind Setup & auth's guard. GET reads and never mutates; POST is the command.
// An unknown tool is TOOL_NOT_FOUND on both routes.
@Controller()
export class ToolsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get(TOOL_ROUTE)
  detail(@Param('name') name: string): ToolDetail {
    return this.catalog.detail(name);
  }

  @Post(TOOL_VALIDATE_ROUTE)
  @HttpCode(200)
  validate(
    @Param('name') name: string,
    @Body(new ZodValidationPipe(toolValidateRequestSchema))
    body: ToolValidateRequest,
  ): ToolValidateResult {
    return this.catalog.validate(name, body);
  }
}
