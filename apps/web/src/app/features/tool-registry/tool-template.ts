// Pure text helpers for the actions of the Tools page: the blank template of New (C6) and the copy of
// Duplicate (C7). This file imports nothing from the contract and nothing from the Shell.

/** The source of a new, blank tool named `name` (C6). It has one line of description and no input. */
export function blankToolSource(name: string): string {
  return [
    'schemaVersion: 1',
    `name: ${name}`,
    'description: Describe what this tool does in one line.',
    'inputs:',
    '  type: object',
    '  properties: {}',
    'output: draft',
    'enabled: true',
    'prompt: |',
    '  Write the passage.',
    '',
  ].join('\n');
}

/**
 * The source of a copy of a tool, named `name`: the first `name:` line is replaced and every other line
 * is kept (C7). A source with no `name:` line is returned unchanged.
 */
export function duplicateToolSource(source: string, name: string): string {
  const pattern = /^name:.*$/m;
  if (!pattern.test(source)) {
    return source;
  }
  return source.replace(pattern, () => `name: ${name}`);
}
