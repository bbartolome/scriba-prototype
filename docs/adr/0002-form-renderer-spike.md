# ADR 0002: Form-renderer spike

Status: draft. Records the TRG-05 spike gate: the vocabulary check, the outcome of the running-app checks and the drag-start finding. Merging TRG-05 closes `phase:form-renderer`. The hint vocabulary was not changed.

## Context

Unit TRG-05 is the spike gate of the Tool registry's `phase:form-renderer`. It renders one workhorse tool, the registry's cold-open fixture (`apps/api/test/fixtures/packs/core/tools/cold_open.yaml`), in two layouts on the `/tools` dev preview: the form layout and the node body, both `ToolForm` (`layout="form"` and `layout="node-body"`). The preview reads the tool once from `GET /api/tool-registry/tools/cold_open`, and its submit posts the form's arguments to `POST /api/tool-registry/tools/cold_open/validate` in `full` mode. The units it builds on are TRG-02 (the registry API and the emitted views), TRG-03 (the Shell and the `/tools` route) and TRG-04 (the entity picker and its drag and drop).

The fixture reaches the running app through the library's user pack (`<library>/.scriba/packs/user/tools/cold_open.yaml`), which the tool registry serves. So the e2e harness and the root `package.json` are unchanged.

## Hint vocabulary

`HINT_KEYS` (`packages/contracts/src/tool-registry/constants.ts`) is the closed set. The fixture was checked against it:

| Key                     | Fixture fields that use it                                                                          | Verdict                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `x-scriba-type`         | `coreIdea` (text), `entityIds` (entity), `styleProfile` (style), `person` (entity), `moment` (text) | Used. Sufficient: it gives each port its type, and `entityIds` shows as `entity list`.                                |
| `x-scriba-port`         | `coreIdea`, `entityIds`, `styleProfile`, `person`, `moment`                                         | Used. Sufficient: these five are the ports. `length` and `tone` have no port flag and are the node body's parameters. |
| `x-scriba-entity-kinds` | `entityIds` (`person`), `person` (`person`)                                                         | Used. Sufficient: the pickers offer only `person` entities (T2 (a)).                                                  |
| `x-scriba-control`      | `coreIdea` (`textarea`)                                                                             | Used. Sufficient: the other fields have no control hint, and the running app derives their controls from their types. |

No field needed a hint that the vocabulary lacks. So no vocabulary change was made.

## Outcome

- T1, one tool response drives both layouts: pass in 3 of 3 e2e runs (Playwright 1.65.0, Chromium build 1254). The form layout has the seven fields in form order, each with a control. The node body has the six port rows (`coreIdea` text, `entityIds` entity list, `styleProfile` style, `person` entity, `moment` text, `output` text) and two controls, `length` (slider) and `tone` (select). One `GET` of the tool, and no page error.
- T2, the picker offers person entities only and takes a dropped person chip: pass in 3 of 3 e2e runs. The `person` and `entityIds` pickers each offer exactly `ada` and `bob`. A real mouse drag of the `ada` chip onto the `person` picker sets it to `ada`, and the form value shows `"person": "ada"`. The `entityIds` picker holds no chip afterwards. The drop target is measured after the drag has started (see the drag-start finding below).
- T3, submit posts to validate, issues show inline, and a valid answer shows its arguments: pass (Vitest, `tools-preview.spec.ts`, 3 tests). The copies agree with the contract (`tool-copy.spec.ts`, 3 tests).
- The step-12 look (`npm run dev`, the dev library, Chromium, 1280 by 1600 px, one session): both layouts render with the same six port rows and two controls as T1. The chips show `ada`, `bob` and `paris`; the chips list every entity of the project, and the pickers filter them. The drag of `ada` onto `person` gave the same result as T2. No page error and no console error. In the screenshot, the node body's `Tone` select reaches the right edge of the 1280 px viewport; this was not measured.
- Not verified: a phone width (no criterion asks for one); browsers other than Chromium; touch and iPad drops (GRR-15 and GRR-17); a drag of a non-person chip such as `paris` onto the `person` picker; the look was one session, not a test.
- C4 is the existing test `AC1` in `apps/api/test/tool-registry-api.test.ts`, run unchanged.

## Drag-start finding (for the owner of TRG-04 and for the canvas drop units)

When a CDK drag starts, every connected drop list runs its enter predicate once, whatever the pointer's path. The `styleProfile` picker refuses a `person` chip, and it writes "A person cannot go here." into its reason line, which was empty before. That line pushes the `person` picker down by 20 px (y 805 to 825 in the reviser's run at 1280 px) as soon as the drag starts. CDK caches each list's rectangle at the start, so the cached `person` rectangle stays 20 px above the select for the rest of the drag. A release at the select's live centre is still taken by the `person` list.

For the owner of TRG-04, and for GRR-12, GRR-15 and GRR-17: a refusing picker's reason line appears when a drag of a refused kind starts. It moves the pickers below it and leaves CDK's cached rectangles of those lists stale for the rest of the drag. This unit does not change it. `entity-picker.ts` is TRG-04's code and was only read here. T2 measures its target after the drag has started and two animation frames have passed.

## Consequences

- TRG-07 builds on the closed set `HINT_KEYS`. This spike leaves it unchanged.
- TRG-13 keeps `toolsRoutes` as the one `/tools` export, extends its content, and keeps `ToolsPreviewPage` as a detail tab. The `tools` entry in the Shell route table stays as it is.
- GRR-11 uses `ToolForm`'s node-body layout with the dev handle template. T1 and the dev handle exercise the same inputs. No `ToolForm` input changed.
