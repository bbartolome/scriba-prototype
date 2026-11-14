import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  importRequestSchema,
  newProjectRequestSchema,
  PROJECT_IMPORT_ROUTE,
  PROJECT_NEW_ROUTE,
  PROJECTS_ROUTE,
  type ImportRequest,
  type NewProjectRequest,
  type ProjectList,
  type ProjectSummary,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { ProjectsService } from './projects.service';

// The project list and its commands, behind Setup & auth's guard. The list is a GET and never mutates; New and
// Import are POSTs. Each answers only the summary of a project, never its folder.
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get(PROJECTS_ROUTE)
  list(): ProjectList {
    return {
      projects: this.projects.discover().map((project) => project.summary),
    };
  }

  @Post(PROJECT_NEW_ROUTE)
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(newProjectRequestSchema))
    body: NewProjectRequest,
  ): ProjectSummary {
    return this.projects.create(body);
  }

  @Post(PROJECT_IMPORT_ROUTE)
  @HttpCode(200)
  importProject(
    @Body(new ZodValidationPipe(importRequestSchema)) body: ImportRequest,
  ): ProjectSummary {
    return this.projects.importProject(body.projectId);
  }
}
