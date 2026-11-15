import type {
  FilesService,
  ProjectsService,
} from '../project-store/project-store.module';

// The fixed system prompt of every agent run: the role, the confinement, the pending changes and the citations (D10 (1)).
export const AGENT_SYSTEM_PROMPT = [
  'You are the writing assistant for one book project. Your work is confined to the active project: use project-relative paths such as sources/outline.md, and do not refer to files outside the project.',
  'Read what you need with the tools before you answer, and say only what the files say.',
  'Writes become pending changes the author accepts or rejects, so a write does not change the book until the author accepts it.',
  'When you rely on a source in sources/, cite it inline with [@id], where id is the source id.',
].join('\n');

// The project summary of one agent run (D10 (2)). It is built once, at the start of the run, from the Project store:
// the title and genre pack from the project list, and each top-level folder with its file count.
export function buildProjectSummary(
  projects: ProjectsService,
  files: FilesService,
  projectId: string,
): string {
  const summary = projects.find(projectId)?.summary;
  if (summary === undefined || summary.status !== 'ok') {
    throw new Error('The active project cannot be read.');
  }
  const entries = files.list(projectId, { path: '.', recursive: true }).entries;
  const folders = entries
    .filter((entry) => entry.kind === 'dir' && !entry.path.includes('/'))
    .map((entry) => entry.path)
    .sort();
  const counted = folders.map((name) => {
    const count = entries.filter(
      (entry) => entry.kind === 'file' && entry.path.startsWith(`${name}/`),
    ).length;
    return `${name} (${count} ${count === 1 ? 'file' : 'files'})`;
  });
  const folderLine =
    counted.length === 0
      ? 'Top-level folders: none.'
      : `Top-level folders: ${counted.join(', ')}.`;
  return `Project: ${summary.title} (genre pack: ${summary.genrePack}).\n${folderLine}`;
}
