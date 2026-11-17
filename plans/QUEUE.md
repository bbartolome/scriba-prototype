# Queue

Written by the scout on 2026-11-17 from main at base commit 38f644f. Lists only units with no plan file, in queue order. Format: <ID> | <milestone> | available | <reason>.

First incomplete milestone: M1 (SAU-22 is still draft; it has a plan, so it is not listed).

TRG-15 | M2 | available: no (blocked by TRG-14, planned) | live previews for the tool editor
TRG-17 | M2 | available: no (blocked by TRG-14, planned; TRG-15) | editor-ui gate, M2 demo
PST-22 | M3 | available: yes | review gate, M3 demo (e2e accept change)
SAU-20 | M3 | available: yes | Tailscale setup UI
AGL-15 | M3 | available: no (blocked by PST-22) | pending-writes gate
AGL-20 | M3 | available: no (blocked by AGL-15) | grounding gate, M3 demo
SAU-21 | M3 | available: no (blocked by SAU-19, planned; SAU-20) | tailnet gate, M3 demo
GRR-02 | M4 | available: yes | graph CRUD
GRR-03 | M4 | available: yes | graph validation
GRR-10 | M4 | available: yes | vflow adapter
GRR-16 | M4 | available: yes | sample recipe
GRR-04 | M4 | available: no (blocked by GRR-02, GRR-03) | run engine core
GRR-09 | M4 | available: no (blocked by GRR-02) | graphs route list
GRR-14 | M4 | available: no (blocked by GRR-10) | story view arrange
GRR-05 | M4 | available: no (blocked by GRR-04) | stop and fail-fast switch
GRR-06 | M4 | available: no (blocked by GRR-04) | output nodes and pending changes
GRR-07 | M4 | available: no (blocked by GRR-04) | run logs and recovery
GRR-11 | M4 | available: no (blocked by GRR-03, GRR-10) | tool nodes and wires
GRR-08 | M4 | available: no (blocked by GRR-02 to GRR-07) | engine gate
GRR-12 | M4 | available: no (blocked by GRR-11) | entity side list chips
GRR-13 | M4 | available: no (blocked by GRR-04, GRR-05, GRR-06, GRR-11) | run controls and status
GRR-15 | M4 | available: no (blocked by GRR-11 to GRR-14) | touch styling and perf
GRR-17 | M4 | available: no (blocked by GRR-02 to GRR-16) | canvas gate, M4 demo
CEX-01 | M5 | available: yes | compile-export contract slice
CEX-02 | M5 | available: no (blocked by CEX-01) | effective order view model
CEX-08 | M5 | available: no (blocked by CEX-01) | nonfiction sample order
CEX-17 | M5 | available: no (blocked by CEX-01) | manuscript route outline
CEX-03 | M5 | available: no (blocked by CEX-02) | order writes
CEX-04 | M5 | available: no (blocked by CEX-02) | assembled markdown
CEX-05 | M5 | available: no (blocked by CEX-02) | preflight endpoint and placeholders
CEX-06 | M5 | available: no (blocked by CEX-05) | claims, orphans, checks
CEX-07 | M5 | available: no (blocked by CEX-05) | entity links and banned phrases
CEX-16 | M5 | available: no (blocked by CEX-03) | snapshot API
CEX-09 | M5 | available: no (blocked by CEX-02 to CEX-08) | assembly preflight gate
CEX-10 | M5 | available: no (blocked by CEX-04, CEX-05, CEX-09) | pandoc runner and md export
CEX-11 | M5 | available: no (blocked by CEX-10) | docx export
CEX-12 | M5 | available: no (blocked by CEX-10) | epub export
CEX-13 | M5 | available: no (blocked by CEX-10) | pdf typst spike
CEX-14 | M5 | available: no (blocked by CEX-03, CEX-10) | template overrides settings
CEX-15 | M5 | available: no (blocked by CEX-10 to CEX-14) | export gate and image smoke
CEX-18 | M5 | available: no (blocked by CEX-05, CEX-10, CEX-14, CEX-17) | preflight and export panels
CEX-19 | M5 | available: no (blocked by CEX-16, CEX-17) | snapshots panel
CEX-20 | M5 | available: no (blocked by CEX-08, CEX-15 to CEX-19) | manuscript milestone gate, M5 demo
GNP-13 | M6 | available: yes | fiction entity types
GNP-14 | M6 | available: no (blocked by GNP-13) | character world builder
GNP-15 | M6 | available: no (blocked by GNP-13) | scene builder
GNP-16 | M6 | available: no (blocked by GNP-13) | dialogue
GNP-17 | M6 | available: no (blocked by GNP-13) | plot manager
GNP-18 | M6 | available: no (blocked by GNP-13, GNP-16) | fiction sample
GNP-19 | M6 | available: no (blocked by GNP-13 to GNP-18, CEX-09, GRR-17) | fiction gate, M6 demo
AGL-21 | M7 | available: yes | web search
AGL-22 | M7 | available: yes | fetch page
AGL-23 | M7 | available: no (blocked by AGL-20) | research gate
AGL-24 | M7 | available: no (blocked by CEX-09, CEX-15) | compile tools
GNP-20 | M7 | available: yes | throughline check
GNP-21 | M7 | available: yes | tier 2 entity and argument shapes
GNP-22 | M7 | available: yes | tier 2 and 3 draft shapes
GNP-23 | M7 | available: no (blocked by GNP-15, GNP-16) | remix
GNP-24 | M7 | available: no (blocked by GNP-19, GNP-23) | remaining shapes gate, M7 demo
PST-23 | M7 | available: yes | lazy migrations
SHL-17 | M7 | available: yes | PWA service worker
SHL-18 | M7 | available: yes | polish: about and shortcuts
SHL-19 | M7 | available: no (blocked by SHL-17, SHL-18, PST-22) | polish gate, M7 demo

## Not listed (have a plan)

SAU-19, SAU-22, TRG-14
