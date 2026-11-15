import type { ToolSourceEntry } from './catalog.service';

// The registry-owned cold-open fixture: a test fixture, not Genre packs content. TRG-06 replaces its source.
export const COLD_OPEN_SOURCE = `schemaVersion: 1
name: cold_open
description: Drafts the cold open of a chapter from its core idea.
inputs:
  type: object
  properties:
    coreIdea:
      type: string
      title: Core idea
      x-scriba-type: text
      x-scriba-port: true
      x-scriba-control: textarea
    entityIds:
      type: array
      title: Entities
      items:
        type: string
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
    styleProfile:
      type: string
      title: Style
      x-scriba-type: style
      x-scriba-port: true
    length:
      type: integer
      title: Length
      default: 800
      minimum: 200
      maximum: 2000
    tone:
      type: string
      title: Tone
      enum: [warm, dry]
    person:
      type: string
      title: Person
      x-scriba-type: entity
      x-scriba-port: true
      x-scriba-entity-kinds: [person]
    moment:
      type: string
      title: Moment
      x-scriba-type: text
      x-scriba-port: true
  required: [coreIdea, person]
output: draft
enabled: true
prompt: |
  Write the cold open of the chapter.

  Core idea: {{coreIdea}}
  {{#each entityIds}}{{entity this}}{{/each}}
`;

// The fixture as a source of the catalog. The origin is a label: the fixture is registry-owned.
export const COLD_OPEN_ENTRY: ToolSourceEntry = {
  origin: 'core',
  source: COLD_OPEN_SOURCE,
};
