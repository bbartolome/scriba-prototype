# Candidate units — scout output, base main a16331a, 2026-11-19
This file is a help for selection, not a record of progress. Plans and unit files are the record.

First incomplete milestone: M4 (demo GRR-17). M1, M2 and M3 are complete. Listed units have no plan file; order is M4, then M5, M6, M7, and within each milestone the units on the path to the demo come first.

| Unit | Milestone | Available now | Reason |
|---|---|---|---|
| GRR-15 | M4 | no | Touch styling and performance; waits on GRR-13, which is planned but not done. |
| GRR-17 | M4 | no | Canvas gate and M4 demo; waits on GRR-13 and GRR-15. |
| CEX-05 | M5 | yes | Preflight endpoint and placeholders check; blocked_by CEX-02, done. |
| CEX-06 | M5 | no | Unsupported-claims and orphan-scenes checks; waits on CEX-05. |
| CEX-07 | M5 | no | Entity-links and banned-phrases checks; waits on CEX-05. |
| CEX-08 | M5 | yes | Nonfiction sample order, statuses and export settings; CEX-01 and PST-11 done. |
| CEX-09 | M5 | no | Assembly-preflight gate; waits on CEX-03 and CEX-04 (not done), CEX-05 to CEX-07. |
| CEX-10 | M5 | no | Pandoc runner and Markdown export; waits on CEX-04, CEX-05, CEX-09. |
| CEX-11 | M5 | no | DOCX export; waits on CEX-10. |
| CEX-12 | M5 | no | EPUB export; waits on CEX-10. |
| CEX-13 | M5 | no | PDF via Typst spike; waits on CEX-10. |
| CEX-14 | M5 | no | Template overrides and export settings; waits on CEX-03 (not done) and CEX-10. |
| CEX-15 | M5 | no | Export gate with image smoke; waits on CEX-10 to CEX-14. |
| CEX-16 | M5 | no | Snapshot API; waits on CEX-03, which is planned but not done. |
| CEX-17 | M5 | yes | Manuscript route UI; CEX-01 and SHL-09 done. |
| CEX-18 | M5 | no | Preflight and export panels; waits on CEX-05, CEX-10, CEX-14, CEX-17. |
| CEX-19 | M5 | no | Snapshots panel; waits on CEX-16 and CEX-17. |
| CEX-20 | M5 | no | Milestone gate and M5 demo; waits on CEX-08, CEX-15 to CEX-19. |
| GNP-14 | M6 | yes | Character world builder; GNP-02 and GNP-13 done. |
| GNP-15 | M6 | yes | Scene builder; GNP-02 and GNP-13 done. |
| GNP-16 | M6 | yes | Dialogue; GNP-02 and GNP-13 done. |
| GNP-17 | M6 | yes | Plot manager; GNP-02 and GNP-13 done. |
| GNP-18 | M6 | no | Fiction sample; waits on GNP-16. |
| GNP-19 | M6 | no | Fiction gate and M6 demo; waits on GNP-14 to GNP-18, CEX-09 and GRR-17. |
| GNP-21 | M7 | yes | Tier 2 entity and argument shapes; GNP-02, GNP-06, GNP-12 done. |
| GNP-22 | M7 | yes | Tier 2 and 3 draft shapes; GNP-02, GNP-06, GNP-12 done. |
| GNP-23 | M7 | no | Remix; waits on GNP-15, GNP-16, GNP-21 and GNP-22. |
| GNP-24 | M7 | no | Remaining-shapes gate and M7 demo; waits on GNP-19, GNP-21 to GNP-23. |
| SHL-17 | M7 | yes | PWA service worker; SHL-09 done. |
| SHL-18 | M7 | yes | Polish: about and shortcuts; SHL-09 done. |
| SHL-19 | M7 | no | Polish gate and M7 demo; waits on SHL-17 and SHL-18. |
| AGL-21 | M7 | yes | Web search tool; AGL-06 and AGL-08 done. |
| AGL-22 | M7 | yes | Fetch-page tool; AGL-02 and AGL-08 done. |
| AGL-23 | M7 | no | Research gate; waits on AGL-21 and AGL-22. |
| AGL-24 | M7 | no | Compile tools; waits on CEX-09 and CEX-15. |
| PST-23 | M7 | yes | Lazy migrations; PST-16 done. |
