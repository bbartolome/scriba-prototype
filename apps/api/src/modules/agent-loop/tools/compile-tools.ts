import {
  exportFormatSchema,
  type ExportFormat,
  type ExportResult,
  type PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  ExportService,
  ManuscriptService,
  PreflightService,
} from '../../compile-export/compile-export.module';
import type { ProjectStoreService } from '../../project-store/project-store.module';
import {
  ToolArgumentError,
  type ToolArgumentSchema,
  type ToolDefinition,
} from './tool-types';

// The compile tools of the compile family (AGL-24). Each is a thin call to a Compile & export service, in process:
// assemble_manuscript reads the manuscript view, run_preflight runs the checks and export_manuscript writes the same
// file as the manuscript view's export button (the same ExportService.export). The services work on the active
// project, so each handler first checks that the run's bound project is the active one (the Project store refuses
// another project). A refusal is a ModuleError or a ToolArgumentError, and the dispatcher counts it as an invalid
// call (S7).

export interface CompileServices {
  store: ProjectStoreService;
  manuscript: ManuscriptService;
  preflight: PreflightService;
  exporter: ExportService;
}

const NO_ARGUMENTS: ToolArgumentSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
};

const EXPORT_SCHEMA: ToolArgumentSchema = {
  type: 'object',
  properties: {
    format: {
      type: 'string',
      description: 'The export format: md, docx, epub or pdf.',
    },
  },
  required: ['format'],
  additionalProperties: false,
};

// Settles with the job, or rejects with a plain Error when the run's signal aborts first (D16). The job goes on in the
// background; its result is dropped by the caller.
function untilStopped<T>(job: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return job;
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new Error('The run was stopped.'));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    job
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

// The counts of a preflight result, by severity. The summary of the export service is not exported, so the count is
// repeated here.
function countsOf(result: PreflightResult): {
  errors: number;
  warnings: number;
  infos: number;
} {
  const counts = { errors: 0, warnings: 0, infos: 0 };
  for (const check of result.checks) {
    for (const finding of check.findings) {
      if (finding.severity === 'error') counts.errors += 1;
      else if (finding.severity === 'warning') counts.warnings += 1;
      else counts.infos += 1;
    }
  }
  return counts;
}

export function compileDefinitions(
  services: CompileServices,
): ToolDefinition[] {
  const { store, manuscript, preflight, exporter } = services;
  return [
    {
      name: 'assemble_manuscript',
      family: 'compile',
      description:
        'Read the manuscript of the active project: its entries in order, the word totals and the warnings. Changes nothing.',
      schema: NO_ARGUMENTS,
      handler: async (ctx) => {
        store.requireActive(ctx.run.projectId);
        const view = manuscript.view();
        return {
          summary: `Read the manuscript: ${view.entries.length} files, ${view.totals.manuscript} words.`,
          output: view,
        };
      },
    },
    {
      name: 'run_preflight',
      family: 'compile',
      description:
        'Run the preflight checks on the manuscript of the active project and return each check with its findings. Changes nothing.',
      schema: NO_ARGUMENTS,
      handler: async (ctx) => {
        store.requireActive(ctx.run.projectId);
        const result = preflight.run(new Date());
        const counts = countsOf(result);
        return {
          summary: `Ran the preflight: ${counts.errors} errors, ${counts.warnings} warnings, ${counts.infos} infos.`,
          output: result,
        };
      },
    },
    {
      name: 'export_manuscript',
      family: 'compile',
      description:
        'Export the manuscript of the active project in one format (md, docx, epub or pdf), as the manuscript view export does. The file is written to the exports folder of the project.',
      schema: EXPORT_SCHEMA,
      handler: async (ctx, args) => {
        store.requireActive(ctx.run.projectId);
        const { format } = args as { format: string };
        const parsed = exportFormatSchema.safeParse(format);
        if (!parsed.success) {
          throw new ToolArgumentError([
            { path: '/format', message: 'must be md, docx, epub or pdf' },
          ]);
        }
        const job: Promise<ExportResult> = exporter.export(
          parsed.data as ExportFormat,
        );
        job.catch(() => undefined);
        const result = await untilStopped(job, ctx.signal);
        return {
          summary: `Exported ${result.fileName} (${result.bytes} bytes).`,
          output: result,
        };
      },
    },
  ];
}
