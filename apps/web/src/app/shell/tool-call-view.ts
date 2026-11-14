/**
 * The status of a tool call, as the card shows it: a word and an icon in the header, never colour
 * alone.
 */
export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

/**
 * A tool call's output. Markdown is rendered by the Shell's Markdown preview (app-markdown-preview,
 * with raw HTML shown as text); JSON is shown as a key/value tree.
 */
export type ToolCallOutput =
  | {
      /** The output kind: Markdown source text. */
      readonly kind: 'markdown';
      /** The Markdown source text. */
      readonly text: string;
    }
  | {
      /** The output kind: a JSON value, shown as a key/value tree. */
      readonly kind: 'json';
      /** Any JSON value. An object or an array is a tree; any other value is one row. */
      readonly value: unknown;
    };

/**
 * One tool call as the card shows it. The host maps its own events onto this model, and the card
 * never reads an event. Only `name` and `status` are required.
 */
export interface ToolCallView {
  /** The tool's name, shown in the header, for example `read_file`. */
  readonly name: string;
  /** The call's status: pending, running, done or error. */
  readonly status: ToolCallStatus;
  /** One line shown in the header even while collapsed, for example `3 files`. */
  readonly summary?: string;
  /** The arguments: a JSON value, shown as a key/value tree. Absent while the call is still written. */
  readonly arguments?: unknown;
  /** The output, as Markdown or JSON. Absent until the call has produced one. */
  readonly output?: ToolCallOutput;
  /** The error text, shown in its own region. */
  readonly error?: string;
  /** The project-relative paths of the source files the call used. */
  readonly sources?: readonly string[];
  /**
   * Whether the body is collapsed. Absent means the device decides: collapsed on a phone, expanded
   * on a tablet or a desktop. An explicit value wins in both directions.
   */
  readonly collapsed?: boolean;
}
