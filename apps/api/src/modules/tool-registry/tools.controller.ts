import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ENTITY_TYPES_ROUTE,
  FUNCTIONS_ROUTE,
  TOOLS_ROUTE,
  TOOL_BUILTIN_ROUTE,
  TOOL_ENABLED_ROUTE,
  TOOL_ROUTE,
  TOOL_USER_ROUTE,
  TOOL_VALIDATE_ROUTE,
  toolEnabledRequestSchema,
  toolListQuerySchema,
  toolValidateRequestSchema,
  type EntityTypeList,
  type FunctionList,
  type ToolDetail,
  type ToolEnabledRequest,
  type ToolList,
  type ToolListQuery,
  type ToolSummary,
  type ToolValidateRequest,
  type ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ZodValidationPipe } from '../platform/platform.module';
import { ActiveGenreService } from './active-genre.service';
import { CatalogService } from './catalog.service';

// The tool read, switch and validate HTTP API, behind Setup & auth's guard. GET reads and never mutates; POST is the
// command. An unknown tool is TOOL_NOT_FOUND on every per-tool route.
@Controller()
export class ToolsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly genre: ActiveGenreService,
  ) {}

  @Get(TOOLS_ROUTE)
  list(
    @Query(new ZodValidationPipe(toolListQuerySchema)) query: ToolListQuery,
  ): ToolList {
    return this.catalog.list(query);
  }

  // The function schemas offered to the active project. With no active project, core and the user pack only.
  @Get(FUNCTIONS_ROUTE)
  functions(): FunctionList {
    return this.catalog.functions(this.genre.genrePack());
  }

  @Get(ENTITY_TYPES_ROUTE)
  entityTypes(): EntityTypeList {
    return this.catalog.entityTypes();
  }

  @Get(TOOL_ROUTE)
  detail(@Param('name') name: string): ToolDetail {
    return this.catalog.detail(name);
  }

  @Get(TOOL_BUILTIN_ROUTE)
  builtin(@Param('name') name: string): ToolDetail {
    return this.catalog.builtinDetail(name);
  }

  @Get(TOOL_USER_ROUTE)
  user(@Param('name') name: string): ToolDetail {
    return this.catalog.userDetail(name);
  }

  @Post(TOOL_ENABLED_ROUTE)
  @HttpCode(200)
  enabled(
    @Param('name') name: string,
    @Body(new ZodValidationPipe(toolEnabledRequestSchema))
    body: ToolEnabledRequest,
  ): ToolSummary {
    return this.catalog.setEnabled(name, body.enabled);
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
