import type { EntityList } from '@bbartolome/scriba-contracts/project-store';
import type { GraphFile } from '@bbartolome/scriba-contracts/graph-runner';
import type { ToolViews } from '@bbartolome/scriba-contracts/tool-registry';
import { isPinned, pinnedValuesOf, splitPort } from './tool-nodes';

// The rules of the entity chips that need no library: the side list's groups, the refusal of a drop, and the
// params a drop or a removal leaves. No library import, so the spec runs alone.

/** One entity of the project's list. */
export type EntityItem = EntityList['entities'][number];

/** A chip as a drag carries it: the entity's id and type. */
export interface EntityChip {
  readonly id: string;
  readonly type: string;
}

/** The entities of one type, in the server's order. */
export interface EntityGroup {
  readonly type: string;
  readonly entities: readonly EntityItem[];
}

/**
 * The entities that match a query, grouped by type. A query matches an entity's id or title, case-insensitively
 * by substring; an empty query matches all. Groups are sorted by type; entries keep the server's order.
 */
export function groupEntitiesOf(
  entities: readonly EntityItem[],
  query: string,
): EntityGroup[] {
  const needle = query.trim().toLowerCase();
  const matches = (entity: EntityItem): boolean =>
    needle === '' ||
    entity.id.toLowerCase().includes(needle) ||
    (entity.title ?? '').toLowerCase().includes(needle);
  const byType = new Map<string, EntityItem[]>();
  for (const entity of entities) {
    if (!matches(entity)) continue;
    const group = byType.get(entity.type) ?? [];
    group.push(entity);
    byType.set(entity.type, group);
  }
  return [...byType.keys()].sort().map((type) => ({
    type,
    entities: byType.get(type) ?? [],
  }));
}

/**
 * The reason a chip drop is refused, or undefined when the drop is accepted. The first failing check gives the
 * reason: a text port; a style port with a chip that is not a style profile; a wired port; a form field whose
 * entity kinds do not list the chip's type; a port the views do not give. `views` holds the ready tool nodes.
 */
export function chipDropRefusalOf(
  file: GraphFile,
  portId: string,
  chip: EntityChip,
  views: ReadonlyMap<string, ToolViews>,
): string | undefined {
  const { nodeId, key } = splitPort(portId);
  const toolViews = views.get(nodeId);
  const port = toolViews?.ports.inputs.find(
    (candidate) => candidate.key === key,
  );
  if (toolViews === undefined || port === undefined) {
    return 'This port takes no entities.';
  }
  if (port.type === 'text') return 'Text ports take no entities.';
  if (port.type === 'style' && chip.type !== 'style-profile') {
    return 'Style ports take style profiles.';
  }
  if (file.edges.some((edge) => edge.to === portId)) {
    return 'This port is already wired.';
  }
  const kinds =
    toolViews.form.fields.find((field) => field.key === key)?.entityKinds ?? [];
  if (kinds.length > 0 && !kinds.includes(chip.type)) {
    return `This port takes ${kinds.join(' or ')} entities.`;
  }
  return undefined;
}

/**
 * The params after an accepted drop: a scalar port takes the chip's id in place of its value; a list port takes
 * the id at its end. A list port that already holds the id gives the same params back (a no-op).
 */
export function pinnedParamsAfterDrop(
  params: Readonly<Record<string, unknown>> | undefined,
  port: { readonly key: string; readonly list: boolean },
  chip: EntityChip,
): Readonly<Record<string, unknown>> {
  if (!port.list) {
    return { ...(params ?? {}), [port.key]: chip.id };
  }
  const values = pinnedValuesOf(params, port.key);
  if (values.includes(chip.id)) return params ?? {};
  return { ...(params ?? {}), [port.key]: [...values, chip.id] };
}

/**
 * The params after a pinned chip is removed: a scalar port loses its key; a list port loses the item at the
 * chip's index, and its key goes when the list is empty. Undefined when no key is left.
 */
export function pinnedParamsAfterRemoval(
  params: Readonly<Record<string, unknown>> | undefined,
  key: string,
  list: boolean,
  index: number,
): Readonly<Record<string, unknown>> | undefined {
  const next: Record<string, unknown> = { ...(params ?? {}) };
  if (!list || !isPinned(params, key)) {
    delete next[key];
  } else {
    const values = pinnedValuesOf(params, key).filter(
      (_, position) => position !== index,
    );
    if (values.length === 0) delete next[key];
    else next[key] = values;
  }
  return Object.keys(next).length === 0 ? undefined : next;
}
