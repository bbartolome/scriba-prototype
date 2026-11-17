import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  GRAPH_CREATE_ROUTE,
  GRAPH_DELETE_ROUTE,
  GRAPH_RENAME_ROUTE,
  GRAPH_ROUTE,
  GRAPH_SAVE_ROUTE,
  GRAPHS_ROUTE,
  graphCreateSchema,
  graphRenameSchema,
  type GraphCreate,
  type GraphDetail,
  type GraphIdResult,
  type GraphList,
  type GraphRename,
} from '@bbartolome/scriba-contracts/graph-runner';
import { ZodValidationPipe } from '../platform/platform.module';
import {
  GraphRunnerService,
  type GraphSaveResult,
} from './graph-runner.service';

// The graph routes, behind Setup & auth's guard. The list and the detail are GETs and never mutate; every command is
// a POST. The save body is not piped: its refusal is GRAPH_SCHEMA_INVALID, decided by the service (P9).
@Controller()
export class GraphsController {
  constructor(private readonly graphs: GraphRunnerService) {}

  @Get(GRAPHS_ROUTE)
  list(): GraphList {
    return this.graphs.list();
  }

  @Get(GRAPH_ROUTE)
  get(@Param('id') id: string): GraphDetail {
    return this.graphs.get(id);
  }

  @Post(GRAPH_CREATE_ROUTE)
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(graphCreateSchema)) body: GraphCreate,
  ): GraphIdResult {
    return this.graphs.create(body);
  }

  @Post(GRAPH_SAVE_ROUTE)
  @HttpCode(200)
  save(@Param('id') id: string, @Body() body: unknown): GraphSaveResult {
    return this.graphs.save(id, body);
  }

  @Post(GRAPH_RENAME_ROUTE)
  @HttpCode(200)
  rename(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(graphRenameSchema)) body: GraphRename,
  ): GraphIdResult {
    return this.graphs.rename(id, body);
  }

  @Post(GRAPH_DELETE_ROUTE)
  @HttpCode(200)
  delete(@Param('id') id: string): void {
    this.graphs.delete(id);
  }
}
