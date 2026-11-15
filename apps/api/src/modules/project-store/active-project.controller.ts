import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ACTIVE_PROJECT_ROUTE,
  activateRequestSchema,
  type ActivateRequest,
  type ActiveProject,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { ActiveProjectService } from './active-project.service';
import { ProjectStoreService } from './project-store.service';

// The active project, behind Setup & auth's guard. GET reads the id and never mutates. POST activates a project,
// which is a switch: it answers the new active id.
@Controller()
export class ActiveProjectController {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly activation: ActiveProjectService,
  ) {}

  @Get(ACTIVE_PROJECT_ROUTE)
  get(): ActiveProject {
    return { active: this.store.activeId() };
  }

  @Post(ACTIVE_PROJECT_ROUTE)
  @HttpCode(200)
  activate(
    @Body(new ZodValidationPipe(activateRequestSchema)) body: ActivateRequest,
  ): ActiveProject {
    return this.activation.activate(body.projectId);
  }
}
