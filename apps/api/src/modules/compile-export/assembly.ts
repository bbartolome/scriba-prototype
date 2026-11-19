// Pure rendering of the assembled Markdown (P4 to P9). No I/O: the service passes plain values.

// The values of the generated YAML metadata block (P6). An absent value leaves its key out.
export interface MetadataValues {
  title: string;
  subtitle?: string;
  author?: string;
  lang: string;
  date: string;
  rights?: string;
  identifier: string;
  contact?: string;
  wordcount: number;
}

// One bibliography entry (P9): the text (a citation, or the fallback of P9) and the url when present.
export interface BibliographyEntry {
  text: string;
  url?: string;
}

// The texts of the matter and body files, already read (bodies with trailing whitespace removed). `bibliography`
// is undefined when the mode is off.
export interface AssemblyParts {
  front: string[];
  dedication?: string;
  body: string[];
  back: string[];
  bibliography?: BibliographyEntry[];
}

// A YAML double-quoted scalar: a JSON string literal is one (P6).
function scalar(value: string): string {
  return JSON.stringify(value);
}

function isSet(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

// The generated YAML metadata block with its fences (P6). Keys in the fixed order; unset keys are left out.
export function renderMetadata(values: MetadataValues): string {
  const lines = [`title: ${scalar(values.title)}`];
  if (isSet(values.subtitle))
    lines.push(`subtitle: ${scalar(values.subtitle)}`);
  if (isSet(values.author)) lines.push(`author: ${scalar(values.author)}`);
  lines.push(`lang: ${scalar(values.lang)}`);
  lines.push(`date: ${scalar(values.date)}`);
  if (isSet(values.rights)) lines.push(`rights: ${scalar(values.rights)}`);
  lines.push(`identifier: ${scalar(values.identifier)}`);
  if (isSet(values.contact)) lines.push(`contact: ${scalar(values.contact)}`);
  lines.push(`wordcount: ${values.wordcount}`);
  return ['---', ...lines, '---'].join('\n');
}

// A fenced div of Pandoc around one file's text (P5). Nothing is added to the text.
function wrap(text: string, classes: string): string {
  return `::: {${classes}}\n${text}\n:::`;
}

// The bibliography block (P9): the heading, then one paragraph per entry, sorted by text in string order. The sort is
// stable, so equal texts keep the order they came in. The heading stays when there is no entry.
export function renderBibliography(entries: BibliographyEntry[]): string {
  const sorted = [...entries].sort((a, b) =>
    a.text < b.text ? -1 : a.text > b.text ? 1 : 0,
  );
  const paragraphs = sorted.map((entry) =>
    entry.url !== undefined ? `${entry.text} ${entry.url}` : entry.text,
  );
  return ['# Bibliography {.unnumbered}', ...paragraphs].join('\n\n');
}

// The whole document (P4, P5): the metadata block, the front matter, the dedication, the body, the back matter and the
// bibliography, one blank line between blocks, one final newline. A text that is empty after trimming adds no block.
export function renderDocument(
  metadata: MetadataValues,
  parts: AssemblyParts,
): string {
  const blocks: string[] = [renderMetadata(metadata)];
  const nonEmpty = (texts: string[]): string[] =>
    texts.map((text) => text.trimEnd()).filter((text) => text.trim() !== '');

  for (const text of nonEmpty(parts.front)) {
    blocks.push(wrap(text, '.unnumbered'));
  }
  if (isSet(parts.dedication) && parts.dedication.trim() !== '') {
    blocks.push(wrap(parts.dedication.trimEnd(), '.unnumbered .unlisted'));
  }
  blocks.push(...nonEmpty(parts.body));
  for (const text of nonEmpty(parts.back)) {
    blocks.push(wrap(text, '.unnumbered'));
  }
  if (parts.bibliography !== undefined) {
    blocks.push(renderBibliography(parts.bibliography));
  }
  return `${blocks.join('\n\n')}\n`;
}
