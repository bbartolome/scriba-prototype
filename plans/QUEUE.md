# Queue
Written by the scout on 2026-11-17 from main at base commit 894eacd. Lists only units with no plan file, in queue order. Format: <ID> | <milestone> | available | <reason>.
First incomplete milestone: M1 (SAU-22 draft; ungated, no demo). M1 demo gate: AGL-08, MPR-08, PLT-11, PLT-18, PST-12, SAU-08, SHL-09, done.
TRG-15 | M2 | available: no (TRG-14) | Live previews — form, tool node, function schema, rendered prompt
TRG-17 | M2 | available: no (TRG-14, TRG-15) | Editor-UI gate — M2 done-when with the shipped workhorses, demo
AGL-20 | M3 | available: yes | Grounding gate — M3 done-when and demo
SAU-21 | M3 | available: yes | Tailnet gate and M3 demo (planner running)
GRR-02 | M4 | available: yes | Module skeleton and graph CRUD through the Project store file API
GRR-03 | M4 | available: yes | Recipe and story-graph validation against the live tool registry
GRR-04 | M4 | available: no (GRR-02, GRR-03) | Run engine core — scope, refusals, sequential topological run, SSE
GRR-05 | M4 | available: no (GRR-04) | Stop, fail-fast on error, and stop on project switch
GRR-06 | M4 | available: no (GRR-04) | Output nodes to pending changes and graphs/ validator registration
GRR-07 | M4 | available: no (GRR-04) | Run logs in logs/recipe-runs and restart recovery
GRR-08 | M4 | available: no (GRR-02, GRR-03, GRR-04, GRR-05, GRR-06, GRR-07) | Engine gate — phase:engine checklist
GRR-09 | M4 | available: no (GRR-02) | Graphs route, graph list with run status, create/rename/delete UI, phone gate
GRR-10 | M4 | available: yes | ngx-vflow adapter layer, both views from graph JSON, edit and save
GRR-11 | M4 | available: no (GRR-03, GRR-10) | Tool nodes from the registry, palette, typed-wire rejection, live validation
GRR-12 | M4 | available: no (GRR-11) | Entity side list and chip drop onto entity/style ports
GRR-13 | M4 | available: no (GRR-04, GRR-05, GRR-06, GRR-11) | Run controls, input-values dialog, live node status, read-only while running
GRR-14 | M4 | available: no (GRR-10) | Story view extras — relation picker, path picker, missing-file badge, Arrange
GRR-15 | M4 | available: no (GRR-11, GRR-12, GRR-13, GRR-14) | Tablet touch, Material styling in both themes, large-graph measurement
GRR-16 | M4 | available: yes | Nonfiction sample recipe (graphs/chapter-opening.json)
GRR-17 | M4 | available: no (GRR-08, GRR-09, GRR-10, GRR-11, GRR-12, GRR-13, GRR-14, GRR-15, GRR-16) | Canvas gate — e2e extension, real-iPad check, M4 demo
CEX-01 | M5 | available: yes | Publish compile-export contract slice and narrow project.yaml order/export
CEX-02 | M5 | available: no (CEX-01) | Module skeleton, manuscript membership, effective-order algorithm, word counts
CEX-03 | M5 | available: no (CEX-02) | Reorder, status and part writes with revision conflicts, full materialisation
CEX-04 | M5 | available: no (CEX-02) | Assembled-Markdown builder — metadata, matter placement, front-matter stripping
CEX-05 | M5 | available: no (CEX-02) | Preflight endpoint, result shape and the placeholders check
CEX-06 | M5 | available: no (CEX-05) | Preflight checks — unsupported claims and orphan scenes
CEX-07 | M5 | available: no (CEX-05) | Preflight checks — broken entity links and banned phrases
CEX-08 | M5 | available: no (CEX-01) | Nonfiction sample — project.yaml order field, mixed statuses, export settings
CEX-09 | M5 | available: no (CEX-02, CEX-03, CEX-04, CEX-05, CEX-06, CEX-07, CEX-08) | Assembly-preflight gate and the exported in-process service
CEX-10 | M5 | available: no (CEX-04, CEX-05, CEX-09) | Pandoc runner, md export, download endpoint, busy/timeout/error mapping
CEX-11 | M5 | available: no (CEX-10) | DOCX export with the standard-manuscript reference document
CEX-12 | M5 | available: no (CEX-10) | EPUB 3 export with stylesheet, TOC and stable identifier
CEX-13 | M5 | available: no (CEX-10) | PDF via Typst, built-in Typst template, and the Typst quality spike ADR
CEX-14 | M5 | available: no (CEX-03, CEX-10) | Per-project template overrides, copy default, export settings endpoints
CEX-15 | M5 | available: no (CEX-10, CEX-11, CEX-12, CEX-13, CEX-14) | Export gate — image smoke step exporting the sample to all four formats
CEX-16 | M5 | available: no (CEX-03) | Snapshot API — create, list, restore with pre-restore snapshot, manifest, events
CEX-17 | M5 | available: no (CEX-01) | Manuscript route — outline with drag reorder, totals, indicators, phone layout
CEX-18 | M5 | available: no (CEX-05, CEX-10, CEX-14, CEX-17) | Preflight panel, export buttons with confirm dialog, export settings panel
CEX-19 | M5 | available: no (CEX-16, CEX-17) | Snapshots panel — create with label, list, restore behind confirmation
CEX-20 | M5 | available: no (CEX-08, CEX-15, CEX-16, CEX-17, CEX-18, CEX-19) | Manuscript-snapshots gate — e2e manuscript step, Word/EPUB check, M5 demo
GNP-13 | M6 | available: yes | Fiction entity types — character, place, world-rule
GNP-14 | M6 | available: no (GNP-13) | character_builder and world_builder tools (entity outputs)
GNP-15 | M6 | available: no (GNP-13) | scene_builder tool
GNP-16 | M6 | available: no (GNP-13) | dialogue tool
GNP-17 | M6 | available: no (GNP-13) | plot_manager tool (check output)
GNP-18 | M6 | available: no (GNP-13, GNP-16) | Fiction sample project (examples/fiction) and its samples.yaml entry
GNP-19 | M6 | available: no (GNP-13, GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, CEX-09, GRR-17) | Fiction gate — fiction-order check, M6 done-when and demo
AGL-21 | M7 | available: yes | Research toggles and web_search against a SearXNG-compatible endpoint
AGL-22 | M7 | available: yes | fetch_page with private-network refusals, size and time caps, untrusted marking
AGL-23 | M7 | available: no (AGL-20, AGL-21, AGL-22) | Research gate
AGL-24 | M7 | available: no (CEX-09, CEX-15) | Compile tools — assemble_manuscript, run_preflight, export_manuscript
GNP-20 | M7 | available: yes | core/throughline_check tool
GNP-21 | M7 | available: yes | named_concept, comparison_set and objection_handler (shipped disabled)
GNP-22 | M7 | available: yes | Nine tier 2–3 nonfiction draft shapes (shipped disabled)
GNP-23 | M7 | available: no (GNP-15, GNP-16, GNP-21, GNP-22) | core/remix tool and the shape-list consistency check
GNP-24 | M7 | available: no (GNP-19, GNP-20, GNP-21, GNP-22, GNP-23) | Remaining-shapes gate — M7 checklist and demo
PST-23 | M7 | available: yes | Lazy, backed-up per-file migrations with a migrator registry
SHL-17 | M7 | available: yes | PWA — manifest, icons, app-shell service worker, reload prompt after update
SHL-18 | M7 | available: yes | About panel, desktop keyboard shortcuts, loading skeletons, Shell empty states
SHL-19 | M7 | available: no (SHL-17, SHL-18) | Polish gate — accessibility pass, e2e phone-viewport check, M7 demo
