import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { putGraph } from './graph-runner-run.kit';
import { putFile } from './project-store-files.kit';

// The fixtures and recipe builders of graph-runner-output.test.ts. No Nest module is defined here (GRR-06 P12).

// The user tool gr_graph (output `graph`): one text port `topic`, one setting `words`, enabled. The shape of GR_TEXT_YAML.
export const GR_GRAPH_YAML = [
  'schemaVersion: 1',
  'name: gr_graph',
  'description: The gr_graph tool.',
  'inputs:',
  '  type: object',
  '  properties:',
  '    topic:',
  '      type: string',
  '      title: Topic',
  '      x-scriba-type: text',
  '      x-scriba-port: true',
  '    words:',
  '      type: integer',
  '      minimum: 1',
  '      title: Words',
  '  required: [topic, words]',
  'output: graph',
  'enabled: true',
  'prompt: |',
  '  Write about {{topic}}.',
  '',
].join('\n');

// The user tool gr_person (output `draft`): an entity port `person`, a text port `topic`, one setting `words`.
// The text of toolYaml('gr_person', { entity: true }) in graph-runner-validation.test.ts.
export const GR_PERSON_YAML = [
  'schemaVersion: 1',
  'name: gr_person',
  'description: The gr_person tool.',
  'inputs:',
  '  type: object',
  '  properties:',
  '    person:',
  '      type: string',
  '      title: Person',
  '      x-scriba-type: entity',
  '      x-scriba-port: true',
  '    topic:',
  '      type: string',
  '      title: Topic',
  '      x-scriba-type: text',
  '      x-scriba-port: true',
  '    words:',
  '      type: integer',
  '      minimum: 1',
  '      title: Words',
  '  required: [words]',
  'output: draft',
  'enabled: true',
  'prompt: |',
  '  Write about {{topic}}.',
  '',
].join('\n');

// The entity Ada of the book project, at book/entities/ada.md.
export const ENTITY_ADA = '---\ntype: person\n---\n# Ada\n';

// The text of book/drafts/chapter.md, the file that file-out reads.
export const CHAPTER_ORIGINAL = 'ORIGINAL TEXT\n';

// Writes the two output tools into the user pack of the library.
function writeOutputTools(library: string): void {
  const folder = join(library, '.scriba', 'packs', 'user', 'tools');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'gr_graph.yaml'), GR_GRAPH_YAML);
  writeFileSync(join(folder, 'gr_person.yaml'), GR_PERSON_YAML);
}

// The prepare step of every output test: the tools, the entity, the chapter file and the four recipes.
export function prepareOutputs(library: string): void {
  writeOutputTools(library);
  putFile(library, 'book/entities/ada.md', ENTITY_ADA);
  putFile(library, 'book/drafts/chapter.md', CHAPTER_ORIGINAL);
  for (const graph of [ENTITY_OUT, FILE_OUT, PRECEDENCE, GRAPH_OUT]) {
    putGraph(library, graph.id, graph.value);
  }
}

// An input node of type entity or text.
function input(id: string, type: 'entity' | 'text', label: string): unknown {
  return {
    id,
    kind: 'input',
    position: { x: 0, y: 0 },
    params: { type, label },
  };
}

// A tool node of a given user tool.
function tool(
  id: string,
  name: string,
  params: Record<string, unknown>,
): unknown {
  return { id, kind: 'tool', position: { x: 0, y: 0 }, tool: name, params };
}

// An output node, with its params when given.
function output(id: string, params?: Record<string, unknown>): unknown {
  return {
    id,
    kind: 'output',
    position: { x: 0, y: 0 },
    ...(params === undefined ? {} : { params }),
  };
}

// A recipe with a given id, nodes and wires.
function recipe(
  id: string,
  nodes: unknown[],
  edges: { id: string; from: string; to: string }[],
): { id: string; value: unknown } {
  return {
    id,
    value: { schemaVersion: 1, view: 'recipe', name: id, nodes, edges },
  };
}

// Entity to the person of gr_person; two outputs, one with a path, one without (C1).
export const ENTITY_OUT = recipe(
  'entity-out',
  [
    input('in2', 'entity', 'Person'),
    tool('n1', 'gr_person', { words: 40 }),
    output('out1'),
    output('out2', { path: 'drafts/second.md' }),
  ],
  [
    { id: 'w1', from: 'in2.out', to: 'n1.person' },
    { id: 'w2', from: 'n1.output', to: 'out1.in' },
    { id: 'w3', from: 'n1.output', to: 'out2.in' },
  ],
);

// A text input fed a file, and an output that targets that file (C2).
export const FILE_OUT = recipe(
  'file-out',
  [
    input('in1', 'text', 'Chapter'),
    tool('n1', 'gr_text', { words: 40 }),
    output('out1', { path: 'drafts/chapter.md' }),
  ],
  [
    { id: 'w1', from: 'in1.out', to: 'n1.topic' },
    { id: 'w2', from: 'n1.output', to: 'out1.in' },
  ],
);

// Three outputs of one tool: one with a path, one with another path, one without (C3).
export const PRECEDENCE = recipe(
  'precedence',
  [
    input('in1', 'text', 'Topic'),
    tool('n1', 'gr_text', { words: 40 }),
    output('out1', { path: 'drafts/from-params.md' }),
    output('out2', { path: 'drafts/second.md' }),
    output('out3'),
  ],
  [
    { id: 'w1', from: 'in1.out', to: 'n1.topic' },
    { id: 'w2', from: 'n1.output', to: 'out1.in' },
    { id: 'w3', from: 'n1.output', to: 'out2.in' },
    { id: 'w4', from: 'n1.output', to: 'out3.in' },
  ],
);

// A graph tool feeding a graph output with no path (C4).
export const GRAPH_OUT = recipe(
  'graph-out',
  [
    input('in1', 'text', 'Topic'),
    tool('n1', 'gr_graph', { words: 40 }),
    output('out1'),
  ],
  [
    { id: 'w1', from: 'in1.out', to: 'n1.topic' },
    { id: 'w2', from: 'n1.output', to: 'out1.in' },
  ],
);
