import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Routes } from '@angular/router';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import {
  SSE_CLIENT,
  ToolCallCard,
  type ToolCallOutput,
  type ToolCallView,
} from '../index';

// Illustrative. The shapes below follow the AGL-01 events (decisions D3 to D7 of plans/AGL-01.md
// and events.ts in the agent-loop contract). They are hand-written, and `data` is read as unknown,
// because the Shell never imports /agent-loop (modules/shell.md, Cross-cutting decisions: "It never consumes `/agent-loop`").

// Stands in for the Project store's entity resolution: an entity id to a project-relative path.
// No request is made; an id that is not in the table is shown as it is.
const PATHS = new Map<string, string>([['outline', 'sources/outline.md']]);

/** The data of one envelope as a record. A value that is not an object gives no fields. */
function fieldsOf(data: unknown): Readonly<Record<string, unknown>> {
  return typeof data === 'object' && data !== null
    ? (data as Readonly<Record<string, unknown>>)
    : {};
}

/** A result's output: a string is Markdown, any other value is JSON, and no output is undefined. */
function outputOf(value: unknown): ToolCallOutput | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string'
    ? { kind: 'markdown', text: value }
    : { kind: 'json', value };
}

/** A result's sourcesUsed: the entity ids, mapped to paths where the table knows them. */
function sourcesOf(ids: unknown): readonly string[] | undefined {
  if (!Array.isArray(ids)) return undefined;
  return ids.map((id: unknown) => {
    const key = String(id);
    return PATHS.get(key) ?? key;
  });
}

/** The error line: the attempt, the message, and the withdrawn marker when it is set. */
function errorOf(data: Readonly<Record<string, unknown>>): string {
  const withdrawn = data['withdrawn'] === true ? ' (withdrawn)' : '';
  return `Attempt ${String(data['attempt'])}: ${String(data['message'])}${withdrawn}`;
}

/** The view after one agent-loop event, or undefined when the event is not a tool-call event. */
function nextView(
  type: string,
  data: Readonly<Record<string, unknown>>,
  callId: string,
  current: ToolCallView | undefined,
): ToolCallView | undefined {
  const base: ToolCallView = current ?? { name: callId, status: 'pending' };
  switch (type) {
    case 'tool-call-started': {
      const name = data['name'];
      return {
        name: typeof name === 'string' ? name : callId,
        status: 'pending',
      };
    }
    case 'tool-call-args':
      return { ...base, status: 'running', arguments: data['arguments'] };
    case 'tool-call-result': {
      const summary = data['summary'];
      return {
        ...base,
        status: 'done',
        summary: typeof summary === 'string' ? summary : undefined,
        output: outputOf(data['output']),
        sources: sourcesOf(data['sourcesUsed']),
      };
    }
    case 'tool-call-error':
      return { ...base, status: 'error', error: errorOf(data) };
    default:
      return undefined;
  }
}

/**
 * A chat page that renders one run's tool calls from the `agent-loop` stream. It keeps one view per
 * call id, in the order the calls started, and binds each card to its `[call]` input only.
 */
@Component({
  imports: [ToolCallCard],
  selector: 'app-sample-chat',
  template: `
    @for (item of calls(); track item.key) {
      <app-tool-call-card [call]="item.view" />
    }
  `,
})
export class SampleChatPage {
  private readonly events = inject(SSE_CLIENT);
  private readonly views = signal<ReadonlyMap<string, ToolCallView>>(new Map());

  protected readonly calls = computed(() =>
    [...this.views()].map(([key, view]) => ({ key, view })),
  );

  constructor() {
    this.events
      .stream('agent-loop')
      .pipe(takeUntilDestroyed())
      .subscribe((envelope: SseEnvelope) => this.apply(envelope));
  }

  private apply(envelope: SseEnvelope): void {
    const data = fieldsOf(envelope.data);
    const callId = data['callId'];
    if (typeof callId !== 'string') return;
    const next = nextView(
      envelope.type,
      data,
      callId,
      this.views().get(callId),
    );
    if (next === undefined) return;
    this.views.update((views) => new Map(views).set(callId, next));
  }
}

/** The routes a lazy entry loads: the sample page at the entry's own path. */
export const sampleChatRoutes: Routes = [
  { path: '', component: SampleChatPage },
];
