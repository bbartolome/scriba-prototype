// Build-time check only. This module imports each of the ten contract subpaths
// so that `ng build` must resolve and bundle every one of them. It is not used
// at runtime, and the app does not read CONTRACT_SUBPATHS.
import * as platform from '@bbartolome/scriba-contracts/platform';
import * as setupAuth from '@bbartolome/scriba-contracts/setup-auth';
import * as providers from '@bbartolome/scriba-contracts/providers';
import * as projectStore from '@bbartolome/scriba-contracts/project-store';
import * as toolRegistry from '@bbartolome/scriba-contracts/tool-registry';
import * as agentLoop from '@bbartolome/scriba-contracts/agent-loop';
import * as graphRunner from '@bbartolome/scriba-contracts/graph-runner';
import * as compileExport from '@bbartolome/scriba-contracts/compile-export';
import * as shell from '@bbartolome/scriba-contracts/shell';
import * as genrePacks from '@bbartolome/scriba-contracts/genre-packs';

export const CONTRACT_SUBPATHS = {
  platform,
  'setup-auth': setupAuth,
  providers,
  'project-store': projectStore,
  'tool-registry': toolRegistry,
  'agent-loop': agentLoop,
  'graph-runner': graphRunner,
  'compile-export': compileExport,
  shell,
  'genre-packs': genrePacks,
} as const;
