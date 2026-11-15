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
  fileEditSchema,
  fileListQuerySchema,
  fileWriteSchema,
  PROJECT_FILE_EDIT_ROUTE,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_FILES_ROUTE,
  type FileEdit,
  type FileList,
  type FileListQuery,
  type FileRead,
  type FileWrite,
  type FileWriteResult,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { FilesService } from './files.service';

// The read takes only the path of the query; its recursive flag has no meaning here.
const fileReadQuerySchema = fileListQuerySchema.pick({ path: true });

// The file API, behind Setup & auth's guard. The two GETs only read. The two POSTs are author saves: the agent and
// the recipes use propose instead (S14).
@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get(PROJECT_FILES_ROUTE)
  list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(fileListQuerySchema)) query: FileListQuery,
  ): FileList {
    return this.files.list(projectId, query);
  }

  @Get(PROJECT_FILE_ROUTE)
  read(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(fileReadQuerySchema)) query: { path: string },
  ): FileRead {
    return this.files.read(projectId, query.path);
  }

  @Post(PROJECT_FILE_WRITE_ROUTE)
  @HttpCode(200)
  write(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(fileWriteSchema)) body: FileWrite,
  ): FileWriteResult {
    return this.files.write(projectId, body);
  }

  @Post(PROJECT_FILE_EDIT_ROUTE)
  @HttpCode(200)
  edit(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(fileEditSchema)) body: FileEdit,
  ): FileWriteResult {
    return this.files.edit(projectId, body);
  }
}
