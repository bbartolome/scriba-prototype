# Queue
Written by the scout on 2026-11-17 from main at base commit f1e7f4a. Lists only units with no plan file, in queue order. Format: <ID> | <milestone> | available | <reason>.
First incomplete milestone: M1 (only SAU-22 is open, draft, and it has a plan). M1 demo gate: AGL-08, MPR-08, PLT-11, PLT-18, PST-12, SAU-08, SHL-09, all done.
TRG-15 | M2 | available: no (TRG-14) | Live previews: form, tool node, function schema, rendered prompt
TRG-17 | M2 | available: no (TRG-14, TRG-15) | Editor-UI gate, M2 done-when and demo
AGL-15 | M3 | available: no (PST-22) | Pending-writes gate, e2e accept-change step
AGL-20 | M3 | available: no (AGL-15) | Grounding gate, M3 done-when and demo
SAU-20 | M3 | available: yes | Tailscale step in /setup, Tailscale and allowlist sections in settings
SAU-21 | M3 | available: no (SAU-20) | Tailnet gate, socket smoke test, real Serve check, M3 demo
GRR-02 | M4 | available: yes | Module skeleton and graph CRUD through the Project store file API
GRR-03 | M4 | available: yes | Recipe and story-graph validation against the tool registry
GRR-04 | M4 | available: no (GRR-02, GRR-03) | Run engine core
GRR-05 | M4 | available: no (GRR-04) | Stop, fail-fast on error, stop on project switch
GRR-06 | M4 | available: no (GRR-04, PST-22) | Output nodes to pending changes
GRR-07 | M4 | available: no (GRR-04) | Run logs in logs/recipe-runs and restart recovery
GRR-08 | M4 | available: no (GRR-02..07, PST-22) | Engine gate, phase:engine checklist
GRR-09 | M4 | available: no (GRR-02) | Graphs route, graph list, create/rename/delete UI
GRR-10 | M4 | available: yes | ngx-vflow adapter layer, both views rendered from graph JSON
GRR-11 | M4 | available: no (GRR-03, GRR-10) | Tool nodes generated from the registry, palette, wires
GRR-12 | M4 | available: no (GRR-11) | Entity side list and chip drop onto ports
GRR-13 | M4 | available: no (GRR-04, GRR-05, GRR-06, GRR-11) | Run controls, input-values dialog, live node status
GRR-14 | M4 | available: no (GRR-10) | Story view extras and Arrange
GRR-15 | M4 | available: no (GRR-11, GRR-12, GRR-13, GRR-14) | Tablet touch, Material styling, large-graph measurement
GRR-16 | M4 | available: yes | Nonfiction sample recipe (graphs/chapter-opening.json)
GRR-17 | M4 | available: no (GRR-08 to GRR-16) | Canvas gate, e2e extension, real-iPad check, M4 demo
CEX-01 | M5 | available: yes | Publish compile-export contract and narrow project.yaml order/export
CEX-02 | M5 | available: no (CEX-01) | Module skeleton, manuscript membership, effective-order algorithm
CEX-03 | M5 | available: no (CEX-02) | Reorder, status and part writes with revision conflicts
CEX-04 | M5 | available: no (CEX-02) | Assembled-Markdown builder
CEX-05 | M5 | available: no (CEX-02) | Preflight endpoint, result shape and placeholders check
CEX-06 | M5 | available: no (CEX-05) | Preflight checks: unsupported claims and orphan scenes
CEX-07 | M5 | available: no (CEX-05) | Preflight checks: broken entity links and banned phrases
CEX-08 | M5 | available: no (CEX-01) | Nonfiction sample: order field, mixed statuses, export settings
CEX-09 | M5 | available: no (CEX-02 to CEX-08) | Assembly-preflight gate and in-process export service
CEX-10 | M5 | available: no (CEX-04, CEX-05, CEX-09) | Pandoc runner, md export, download endpoint
CEX-11 | M5 | available: no (CEX-10) | DOCX export with standard-manuscript reference document
CEX-12 | M5 | available: no (CEX-10) | EPUB 3 export with stylesheet, TOC and identifier
CEX-13 | M5 | available: no (CEX-10) | PDF via Typst, built-in template, quality spike ADR
CEX-14 | M5 | available: no (CEX-03, CEX-10) | Per-project template overrides and export settings endpoints
CEX-15 | M5 | available: no (CEX-10 to CEX-14) | Export gate, image smoke step for all four formats
CEX-16 | M5 | available: no (CEX-03) | Snapshot API: create, list, restore with pre-restore snapshot
CEX-17 | M5 | available: no (CEX-01) | Manuscript route: outline with drag reorder and totals
CEX-18 | M5 | available: no (CEX-17, CEX-05, CEX-10, CEX-14) | Preflight panel, export buttons, export settings panel
CEX-19 | M5 | available: no (CEX-16, CEX-17) | Snapshots panel: create, list, restore behind confirmation
CEX-20 | M5 | available: no (CEX-08, CEX-15 to CEX-19, PST-22) | Manuscript-snapshots gate, e2e step, M5 demo
GNP-13 | M6 | available: yes | Fiction entity types: character, place, world-rule
GNP-14 | M6 | available: no (GNP-13) | character_builder and world_builder tools
GNP-15 | M6 | available: no (GNP-13) | scene_builder tool
GNP-16 | M6 | available: no (GNP-13) | dialogue tool
GNP-17 | M6 | available: no (GNP-13) | plot_manager tool
GNP-18 | M6 | available: no (GNP-13, GNP-16) | Fiction sample project and samples.yaml entry
GNP-19 | M6 | available: no (GNP-13 to GNP-18, CEX-09, GRR-17) | Fiction gate, fiction-order check, M6 demo
AGL-21 | M7 | available: yes | Research toggles and web_search against a SearXNG-compatible endpoint
AGL-22 | M7 | available: yes | fetch_page with private-network refusals, size and time caps
AGL-23 | M7 | available: no (AGL-20, AGL-21, AGL-22) | Research gate
AGL-24 | M7 | available: no (CEX-09, CEX-15) | Compile tools: assemble_manuscript, run_preflight, export_manuscript
GNP-20 | M7 | available: yes | core/throughline_check tool
GNP-21 | M7 | available: yes | named_concept, comparison_set, objection_handler (shipped disabled)
GNP-22 | M7 | available: yes | Nine tier 2-3 nonfiction draft shapes (shipped disabled)
GNP-23 | M7 | available: no (GNP-15, GNP-16, GNP-21, GNP-22) | core/remix tool and shape-list consistency check
GNP-24 | M7 | available: no (GNP-19 to GNP-23) | Remaining-shapes gate, M7 checklist and demo
PST-23 | M7 | available: yes | Lazy, backed-up per-file migrations with a migrator registry
SHL-17 | M7 | available: yes | PWA: manifest, icons, app-shell service worker, reload prompt
SHL-18 | M7 | available: yes | About panel, desktop shortcuts, loading skeletons, empty states
SHL-19 | M7 | available: no (SHL-17, SHL-18, PST-22) | Polish gate, accessibility pass, e2e phone check, M7 demo
