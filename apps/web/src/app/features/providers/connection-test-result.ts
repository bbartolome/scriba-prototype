import { Component, computed, input } from '@angular/core';
import type {
  ConnectionTestResult,
  ConnectionTestStage,
} from '@bbartolome/scriba-contracts/providers';
import { TEXTS } from './providers-texts';

// The three stages in order, with the labels the user reads.
const STAGES: { stage: ConnectionTestStage; label: string }[] = [
  { stage: 'reach', label: TEXTS.stageReach },
  { stage: 'list', label: TEXTS.stageList },
  { stage: 'chat', label: TEXTS.stageChat },
];

/**
 * The staged result of a connection test (MPR-10 D4). Presentational: it shows the result it is
 * given, and it leaves out a server hint equal to `omitHint`, the text the form already shows (D8).
 */
@Component({
  selector: 'app-connection-test-result',
  styles: `
    .result {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .result h4 {
      margin: 0.5rem 0 0;
    }
    .result ul {
      margin: 0;
      padding-left: 1.25rem;
    }
    .problem {
      color: var(--mat-sys-error);
      margin: 0;
    }
  `,
  template: `
    @if (result(); as current) {
      <div class="result">
        <h4>{{ texts.testHeading }}</h4>
        <ul>
          @for (row of rows(); track row.label) {
            <li>{{ row.label }}: {{ row.state }}</li>
          }
        </ul>
        @if (current.ok) {
          <p>{{ texts.testPassed }}</p>
        }
        @if (current.error; as error) {
          <p class="problem">{{ error.message }}</p>
          @if (shownHint(); as hint) {
            <p>{{ hint }}</p>
          }
        }
        <p>{{ texts.latency(current.latencyMs) }}</p>
        @if (current.modelCount !== undefined) {
          <p>{{ texts.modelCount(current.modelCount) }}</p>
        }
      </div>
    }
  `,
})
export class ConnectionTestResultView {
  readonly result = input<ConnectionTestResult | undefined>(undefined);
  readonly omitHint = input<string | undefined>(undefined);

  protected readonly texts = TEXTS;

  /**
   * The state of each stage. The stages before the failing one passed, the failing one failed and
   * the later ones did not run. A passed test has all three passed.
   */
  protected readonly rows = computed(() => {
    const current = this.result();
    if (current === undefined) {
      return [];
    }
    const failedAt = current.ok
      ? STAGES.length
      : STAGES.findIndex((entry) => entry.stage === current.stage);
    return STAGES.map((entry, index) => ({
      label: entry.label,
      state:
        index < failedAt
          ? TEXTS.statePassed
          : index === failedAt
            ? TEXTS.stateFailed
            : TEXTS.stateNotRun,
    }));
  });

  /** The server's hint, unless it is the text the form already shows. */
  protected readonly shownHint = computed(() => {
    const hint = this.result()?.error?.hint;
    return hint === undefined || hint === this.omitHint() ? undefined : hint;
  });
}
