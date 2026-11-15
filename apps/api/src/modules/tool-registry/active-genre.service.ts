import { Injectable } from '@nestjs/common';
import { parse } from 'yaml';
import { projectYamlSchema } from '@bbartolome/scriba-contracts/project-store';
import {
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';

// The genre pack of the active project, read from its project.yaml. With no active project, or when the file cannot
// be read or checked, there is no genre: the catalog then offers core and the user pack only.
@Injectable()
export class ActiveGenreService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
  ) {}

  genrePack(): string | undefined {
    const projectId = this.store.activeId();
    if (projectId === null) return undefined;
    try {
      const { content } = this.files.read(projectId, 'project.yaml');
      const checked = projectYamlSchema.safeParse(parse(content));
      return checked.success ? checked.data.genrePack : undefined;
    } catch {
      return undefined;
    }
  }
}
