# Queue (scout, 2026-11-18): M2; 43 units without a plan, in sequence
TRG-15 | M2 | not available | waits on TRG-14 (planned)
TRG-17 | M2 | not available | waits on TRG-14 (planned), TRG-15
GRR-12 | M4 | not available | waits on GRR-11 (planned)
GRR-13 | M4 | not available | waits on GRR-11 (planned)
GRR-14 | M4 | available | no blocker
GRR-15 | M4 | not available | waits on GRR-11 (planned), GRR-12, GRR-13, GRR-14
GRR-17 | M4 | not available | waits on GRR-11 (planned), GRR-12, GRR-13, GRR-14 and 1 more
CEX-03 | M5 | available | no blocker
CEX-04 | M5 | available | no blocker
CEX-05 | M5 | available | no blocker
CEX-06 | M5 | not available | waits on CEX-05
CEX-07 | M5 | not available | waits on CEX-05
CEX-08 | M5 | available | no blocker
CEX-09 | M5 | not available | waits on CEX-03, CEX-04, CEX-05, CEX-06 and 2 more
CEX-10 | M5 | not available | waits on CEX-04, CEX-05, CEX-09
CEX-11 | M5 | not available | waits on CEX-10
CEX-12 | M5 | not available | waits on CEX-10
CEX-13 | M5 | not available | waits on CEX-10
CEX-14 | M5 | not available | waits on CEX-03, CEX-10
CEX-15 | M5 | not available | waits on CEX-10, CEX-11, CEX-12, CEX-13 and 1 more
CEX-16 | M5 | not available | waits on CEX-03
CEX-17 | M5 | available | no blocker
CEX-18 | M5 | not available | waits on CEX-17, CEX-05, CEX-10, CEX-14
CEX-19 | M5 | not available | waits on CEX-16, CEX-17
CEX-20 | M5 | not available | waits on CEX-08, CEX-15, CEX-16, CEX-17 and 2 more
GNP-14 | M6 | available | no blocker
GNP-15 | M6 | available | no blocker
GNP-16 | M6 | available | no blocker
GNP-17 | M6 | available | no blocker
GNP-18 | M6 | not available | waits on GNP-16
GNP-19 | M6 | not available | waits on GNP-14, GNP-15, GNP-16, GNP-17 and 3 more
AGL-21 | M7 | available | no blocker
AGL-22 | M7 | available | no blocker
AGL-23 | M7 | not available | waits on AGL-21, AGL-22
AGL-24 | M7 | not available | waits on CEX-09, CEX-15
GNP-21 | M7 | available | no blocker
GNP-22 | M7 | available | no blocker
GNP-23 | M7 | not available | waits on GNP-15, GNP-16, GNP-21, GNP-22
GNP-24 | M7 | not available | waits on GNP-19, GNP-21, GNP-22, GNP-23
PST-23 | M7 | available | no blocker
SHL-17 | M7 | available | no blocker
SHL-18 | M7 | available | no blocker
SHL-19 | M7 | not available | waits on SHL-17, SHL-18
