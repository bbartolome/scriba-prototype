import type { RecipeGraph, StoryGraph } from './graph.js';

/**
 * Example graph files for the contract tests and for consumers (GRR-10). Data only. The canonical file text of
 * each is `JSON.stringify(value, null, 2)` plus a final newline, with the keys in schema order.
 */
export const GRAPH_RUNNER_EXAMPLES: { story: StoryGraph; recipe: RecipeGraph } =
  {
    story: {
      schemaVersion: 1,
      view: 'story',
      name: 'Lighthouse arrival',
      nodes: [
        {
          id: 'veteran-keeper',
          kind: 'entity',
          label: 'The veteran keeper',
          path: 'entities/veteran-keeper.md',
          position: { x: 0, y: 0 },
        },
        {
          id: 'lighthouse',
          kind: 'entity',
          label: 'The lighthouse',
          path: 'entities/lighthouse.md',
          position: { x: 0, y: 160 },
        },
        {
          id: 'arrival-first',
          kind: 'scene',
          label: 'Arrival',
          path: 'drafts/arrival.md',
          position: { x: 320, y: 0 },
        },
        {
          id: 'arrival-second',
          kind: 'scene',
          label: 'The supply boat',
          path: 'drafts/arrival.md',
          position: { x: 640, y: 0 },
        },
        {
          id: 'the-storm',
          kind: 'scene',
          label: 'The storm',
          path: 'drafts/the-storm.md',
          position: { x: 960, y: 0 },
        },
        {
          id: 'dread',
          kind: 'beat',
          label: 'Dread builds',
          position: { x: 960, y: 160 },
        },
        {
          id: 'ledger',
          kind: 'beat',
          label: 'The ledger',
          path: 'drafts/ledger.md',
          position: { x: 1280, y: 0 },
        },
      ],
      edges: [
        {
          id: 'e1',
          from: 'arrival-first',
          to: 'arrival-second',
          relation: 'order',
        },
        {
          id: 'e2',
          from: 'arrival-second',
          to: 'the-storm',
          relation: 'order',
        },
        { id: 'e3', from: 'the-storm', to: 'ledger', relation: 'order' },
        { id: 'e4', from: 'the-storm', to: 'dread', relation: 'containment' },
        { id: 'e5', from: 'dread', to: 'ledger', relation: 'causality' },
        {
          id: 'e6',
          from: 'veteran-keeper',
          to: 'arrival-first',
          relation: 'POV',
        },
      ],
    },
    recipe: {
      schemaVersion: 1,
      view: 'recipe',
      name: 'Chapter opening',
      nodes: [
        {
          id: 'chapter-notes',
          kind: 'input',
          position: { x: 0, y: 0 },
          params: { type: 'text', label: 'Chapter notes' },
        },
        {
          id: 'people',
          kind: 'input',
          position: { x: 0, y: 160 },
          params: { type: 'entity', label: 'Key people', entityKind: 'person' },
        },
        {
          id: 'house-style',
          kind: 'input',
          position: { x: 0, y: 320 },
          params: { type: 'style', label: 'House style' },
        },
        {
          id: 'mystery',
          kind: 'tool',
          position: { x: 320, y: 0 },
          tool: 'mystery_question',
          params: { words: 40 },
        },
        {
          id: 'cold-open',
          kind: 'tool',
          position: { x: 640, y: 160 },
          tool: 'cold_open',
          params: { voice: 'veteran-keeper', words: 400 },
        },
        {
          id: 'draft',
          kind: 'output',
          position: { x: 960, y: 160 },
          params: { label: 'Chapter draft', path: 'drafts/chapter-opening.md' },
        },
      ],
      edges: [
        { id: 'w1', from: 'chapter-notes.out', to: 'mystery.text' },
        { id: 'w2', from: 'mystery.output', to: 'cold-open.question' },
        { id: 'w3', from: 'people.out', to: 'cold-open.people' },
        { id: 'w4', from: 'house-style.out', to: 'cold-open.style' },
        { id: 'w5', from: 'cold-open.output', to: 'draft.in' },
      ],
    },
  };
