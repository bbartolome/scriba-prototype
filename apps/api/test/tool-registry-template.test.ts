import type {
  ResolvedEntity,
  ToolArguments,
} from '@bbartolome/scriba-contracts/tool-registry';
import { expect, it } from 'vitest';
import {
  parseTemplate,
  renderTemplate,
  type ToolCatalogEntry,
} from '../src/modules/tool-registry/template';

// Parses a fixture that the test expects to be valid.
function parseOk(source: string) {
  const parsed = parseTemplate(source);
  if (!parsed.ok) {
    throw new Error(
      `expected a valid template, got ${JSON.stringify(parsed.diagnostics)}`,
    );
  }
  return parsed.ast;
}

const proposeGraph: ToolCatalogEntry = {
  name: 'propose_graph',
  description: 'Sketch a story graph or a recipe from a plain-language intent.',
  ports: {
    inputs: [
      {
        key: 'intent',
        type: 'text',
        list: false,
        required: true,
        title: 'Intent',
      },
      {
        key: 'entityIds',
        type: 'entity',
        list: true,
        required: false,
        title: 'Entities',
      },
    ],
    output: { key: 'output', type: 'text', kind: 'graph' },
    params: ['view', 'files'],
  },
};

it('criterion 1: fields, arrays, absent fields, each with this and @index, if/else, comments and toolCatalog render as specified', () => {
  const template =
    [
      'Role: draft {{coreIdea}}.',
      '{{#if coreIdea}}Idea set.{{else}}No idea.{{/if}}',
      'Material: {{entityIds}}',
      'Length: {{length}}',
      '{{#each entityIds}}',
      '{{@index}}: {{this}}',
      '{{/each}}',
      '{{#if tone}}Tone: {{tone}}{{else}}Tone: none{{/if}}',
      '{{!-- a comment --}}',
      'Tools:',
      '{{toolCatalog}}',
    ].join('\n') + '\n';
  const args: ToolArguments = {
    coreIdea: 'the <lighthouse> & "keeper"',
    entityIds: ['ada', 'bo'],
  };
  const expected =
    [
      'Role: draft the <lighthouse> & "keeper".',
      'Idea set.',
      'Material: ada, bo',
      'Length: ',
      '0: ada',
      '1: bo',
      'Tone: none',
      'Tools:',
      '- propose_graph: Sketch a story graph or a recipe from a plain-language intent. Output: graph. Inputs: intent (text, single, required); entityIds (entity, list, optional).',
    ].join('\n') + '\n';

  const ast = parseOk(template);
  expect(
    renderTemplate(ast, { args, entities: [], toolCatalog: [proposeGraph] }),
  ).toBe(expected);
});

it('criterion 2: entity inside each inserts each entity header and content, in the order of the list', () => {
  const template = '{{#each entityIds}}\n{{entity this}}\n{{/each}}';
  const entities: ResolvedEntity[] = [
    {
      ref: 'ada',
      type: 'character',
      path: 'characters/ada.md',
      content: 'Ada keeps the light.',
    },
    {
      ref: 'bo',
      type: 'character',
      path: 'characters/bo.md',
      content: 'Bo owns the boat.',
    },
    {
      ref: 'cy',
      type: 'character',
      path: 'characters/cy.md',
      content: 'Cy is not listed.',
    },
  ];
  const args: ToolArguments = { entityIds: ['bo', 'ada'] };
  const expected =
    'character bo (characters/bo.md)\nBo owns the boat.\ncharacter ada (characters/ada.md)\nAda keeps the light.\n';

  const ast = parseOk(template);
  expect(renderTemplate(ast, { args, entities, toolCatalog: [] })).toBe(
    expected,
  );
});

it('criterion 3: unbalanced blocks and unsupported syntax give exactly one positioned diagnostic each', () => {
  const cases: [
    label: string,
    template: string,
    line: number,
    column: number,
  ][] = [
    ['a', 'Intro\n{{#each entityIds}}\nbody', 2, 1],
    ['b', 'Intro\n  {{/if}}', 2, 3],
    ['c', '{{#if coreIdea}}a{{/each}}', 1, 18],
    ['d', '{{#if coreIdea}}a{{else}}b{{else}}c{{/if}}', 1, 27],
    ['e', 'Triple {{{coreIdea}}}', 1, 8],
    ['f', '{{> header}}', 1, 1],
    ['g', '{{upper coreIdea}}', 1, 1],
    ['h', '{{../coreIdea}}', 1, 1],
    ['i', '{{this}}', 1, 1],
    ['j', '{{else}}', 1, 1],
    ['k', '{{#each entityIds}}{{this}}', 1, 1],
    ['l', '{{coreIdea', 1, 1],
    ['m', '{{!-- open', 1, 1],
  ];

  for (const [label, template, line, column] of cases) {
    const result = parseTemplate(template);
    expect(result.ok, `case ${label}`).toBe(false);
    if (result.ok) continue;
    expect(
      result.diagnostics.map((diagnostic) => ({
        line: diagnostic.line,
        column: diagnostic.column,
      })),
      `case ${label}`,
    ).toEqual([{ line, column }]);
    expect(
      result.diagnostics[0]?.message.length ?? 0,
      `case ${label} message`,
    ).toBeGreaterThan(0);
  }
});

it('criterion 4: __proto__ and constructor lookups render nothing', () => {
  const args: ToolArguments = JSON.parse(
    '{"__proto__": ["x"], "coreIdea": "y"}',
  );
  expect(Object.hasOwn(args, '__proto__')).toBe(true);
  const template =
    '[{{__proto__}}][{{constructor}}][{{#each __proto__}}e{{/each}}][{{#if constructor}}yes{{else}}no{{/if}}][{{entity constructor}}]';

  const ast = parseOk(template);
  expect(renderTemplate(ast, { args, entities: [], toolCatalog: [] })).toBe(
    '[][][][no][]',
  );
});
