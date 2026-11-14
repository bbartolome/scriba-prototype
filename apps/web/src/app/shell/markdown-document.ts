import { EditorState, type Extension } from '@codemirror/state';

// The line model of a loaded text. The document splits and joins on one separator: the dominant
// one, so that a CRLF file keeps its CRLF lines and a mixed file keeps every byte it had.

/**
 * The separator the text uses most. CRLF when its CRLF pairs outnumber its bare LF line breaks,
 * LF otherwise (also on a tie, and for a text with no line break). A lone CR is not counted.
 */
export function dominantLineSeparator(raw: string): '\r\n' | '\n' {
  const separators = raw.match(/\r?\n/g) ?? [];
  const crlf = separators.filter((separator) => separator === '\r\n').length;
  const lf = separators.length - crlf;
  return crlf > lf ? '\r\n' : '\n';
}

/** The extension that sets the document's line separator from the loaded text. */
export function documentExtensions(raw: string): Extension {
  return EditorState.lineSeparator.of(dominantLineSeparator(raw));
}

/**
 * The text as the document holds it, with its separators as the file had them. `sliceDoc` joins
 * with the document's separator; `Text.toString` would join with LF and rewrite CRLF lines.
 */
export function documentText(state: EditorState): string {
  return state.sliceDoc();
}
