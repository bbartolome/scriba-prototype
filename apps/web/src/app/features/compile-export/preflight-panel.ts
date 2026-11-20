import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type {
  ExportFormat,
  ExportResult,
  FindingSeverity,
  PreflightCheckId,
  PreflightFinding,
  PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import { ActiveProjectSignal, API_CLIENT, ApiError } from '../../shell';
import {
  EXPORT_FORMAT_VALUES,
  EXPORT_PATH,
  exportResultCopy,
  PREFLIGHT_PATH,
  preflightResultCopy,
} from './export-contract';

// The preflight panel on the manuscript route (CEX-18). It runs preflight on demand, lists the findings by
// check with a link to each location, and exports each format. An export with errors held asks first.
// A held result is shown only while it belongs to the active project.

/** A result with the project it was read for. */
interface Held<T> {
  readonly projectId: string;
  readonly value: T;
}

interface FindingRow {
  readonly severity: FindingSeverity;
  readonly location: string;
  readonly message: string;
  readonly query: Record<string, string>;
}

interface CheckRow {
  readonly id: PreflightCheckId;
  readonly label: string;
  readonly status: string;
  readonly findings: readonly FindingRow[];
}

const CHECK_LABELS: Record<PreflightCheckId, string> = {
  placeholders: 'Placeholders',
  'unsupported-claims': 'Unsupported claims',
  'orphan-scenes': 'Orphan scenes',
  'entity-links': 'Entity links',
  'banned-phrases': 'Banned phrases',
};

/** The value of a held result, when it was read for the active project. */
function heldFor<T>(
  held: Held<T> | undefined,
  projectId: string | undefined,
): T | undefined {
  if (held === undefined || projectId === undefined) return undefined;
  return held.projectId === projectId ? held.value : undefined;
}

/** The message of a failed request: an ApiError's own message, or the fallback for any other error. */
function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The request failed.';
}

/** The query of a finding's link: its path, then its line and offset where it has them (C16). */
function queryOf(finding: PreflightFinding): Record<string, string> {
  const query: Record<string, string> = { path: finding.path };
  if (finding.line !== undefined) query['line'] = String(finding.line);
  if (finding.offset !== undefined) query['offset'] = String(finding.offset);
  return query;
}

function rowOf(finding: PreflightFinding): FindingRow {
  const location =
    finding.line === undefined
      ? finding.path
      : `${finding.path}, line ${finding.line}`;
  return {
    severity: finding.severity,
    location,
    message: finding.message,
    query: queryOf(finding),
  };
}

/** The number of findings of one severity in a result. */
function countOf(result: PreflightResult, severity: FindingSeverity): number {
  return result.checks
    .flatMap((check) => check.findings)
    .filter((finding) => finding.severity === severity).length;
}

/** The question an export asks when the last preflight has errors (C2). */
function confirmMessage(errors: number): string {
  return errors === 1
    ? '1 error. Export anyway?'
    : `${errors} errors. Export anyway?`;
}

@Component({
  selector: 'app-preflight-panel',
  imports: [RouterLink],
  template: `
    <section>
      <h2>Preflight</h2>

      <button type="button" (click)="runPreflight()">Run preflight</button>

      @if (failure(); as message) {
        <p role="alert">{{ message }}</p>
      }

      @if (checks(); as list) {
        <p>
          Errors: {{ counts().errors }}. Warnings: {{ counts().warnings }}.
          Infos: {{ counts().infos }}.
        </p>
        @for (check of list; track check.id) {
          <section [attr.data-check]="check.id">
            <h3>{{ check.label }}: {{ check.status }}</h3>
            @if (check.findings.length === 0) {
              <p>No findings.</p>
            } @else {
              <ul>
                @for (finding of check.findings; track $index) {
                  <li data-finding>
                    <span>{{ finding.severity }}</span>
                    <a
                      [routerLink]="['/projects', projectId(), 'files']"
                      [queryParams]="finding.query"
                      >{{ finding.location }}</a
                    >
                    <span>{{ finding.message }}</span>
                  </li>
                }
              </ul>
            }
          </section>
        }
      }

      <div>
        @for (format of formats; track format) {
          <button type="button" (click)="exportAs(format)">
            Export {{ format }}
          </button>
        }
      </div>

      @if (exported(); as result) {
        <section>
          <p>
            {{ result.fileName }}: {{ result.bytes }} bytes. Preflight errors:
            {{ result.preflight.errors }}.
          </p>
          <a [href]="result.downloadUrl" download
            >Download {{ result.fileName }}</a
          >
          @if (result.warnings.length > 0) {
            <ul>
              @for (warning of result.warnings; track $index) {
                <li>{{ warning }}</li>
              }
            </ul>
          }
        </section>
      }
    </section>
  `,
})
export class PreflightPanel {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly projectId = inject(ActiveProjectSignal).projectId;

  protected readonly formats = EXPORT_FORMAT_VALUES;

  /** The last preflight and the last export, each with the project it was read for (C5). */
  private readonly preflight = signal<Held<PreflightResult> | undefined>(
    undefined,
  );
  private readonly exportHeld = signal<Held<ExportResult> | undefined>(
    undefined,
  );
  protected readonly failure = signal<string | undefined>(undefined);

  private readonly shownPreflight = computed(() => {
    return heldFor(this.preflight(), this.projectId());
  });

  protected readonly exported = computed(() => {
    return heldFor(this.exportHeld(), this.projectId());
  });

  protected readonly checks = computed<CheckRow[] | undefined>(() =>
    this.shownPreflight()?.checks.map((check) => ({
      id: check.id,
      label: CHECK_LABELS[check.id],
      status: check.status,
      findings: check.findings.map(rowOf),
    })),
  );

  protected readonly counts = computed(() => {
    const result = this.shownPreflight();
    return {
      errors: result ? countOf(result, 'error') : 0,
      warnings: result ? countOf(result, 'warning') : 0,
      infos: result ? countOf(result, 'info') : 0,
    };
  });

  /** Runs preflight now. Nothing else sends it (D1). */
  protected runPreflight(): void {
    const projectId = this.projectId();
    if (projectId === undefined) return;
    this.api
      .post(PREFLIGHT_PATH, {}, preflightResultCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          this.preflight.set({ projectId, value });
          this.failure.set(undefined);
        },
        error: (error: unknown) => this.failure.set(failureMessage(error)),
      });
  }

  /**
   * Exports one format. When the last preflight of this project has errors, it asks first and sends
   * nothing when the author cancels (D2, C2, C17).
   */
  protected exportAs(format: ExportFormat): void {
    const projectId = this.projectId();
    if (projectId === undefined) return;
    const errors = this.counts().errors;
    if (errors > 0 && !window.confirm(confirmMessage(errors))) return;
    this.api
      .post(EXPORT_PATH, { format }, exportResultCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          this.exportHeld.set({ projectId, value });
          this.failure.set(undefined);
        },
        error: (error: unknown) => {
          this.exportHeld.set(undefined);
          this.failure.set(failureMessage(error));
        },
      });
  }
}
