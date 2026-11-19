# Queue (scout, 2026-11-19): M2; 39 units without a plan, in sequence
TRG-17 | M2 | available | all blockers done
GRR-15 | M4 | not available | waits on GRR-12, GRR-13
GRR-17 | M4 | not available | waits on GRR-12, GRR-13, GRR-15
CEX-03 | M5 | available | all blockers done
CEX-04 | M5 | available | all blockers done
CEX-05 | M5 | available | all blockers done
CEX-06 | M5 | not available | waits on CEX-05
CEX-07 | M5 | not available | waits on CEX-05
CEX-08 | M5 | available | all blockers done
CEX-09 | M5 | not available | waits on CEX-03, CEX-04, CEX-05, CEX-06, CEX-07, CEX-08
CEX-10 | M5 | not available | waits on CEX-04, CEX-05, CEX-09
CEX-11 | M5 | not available | waits on CEX-10
CEX-12 | M5 | not available | waits on CEX-10
CEX-13 | M5 | not available | waits on CEX-10
CEX-14 | M5 | not available | waits on CEX-03, CEX-10
CEX-15 | M5 | not available | waits on CEX-10, CEX-11, CEX-12, CEX-13, CEX-14
CEX-16 | M5 | not available | waits on CEX-03
CEX-17 | M5 | available | all blockers done
CEX-18 | M5 | not available | waits on CEX-17, CEX-05, CEX-10, CEX-14
CEX-19 | M5 | not available | waits on CEX-16, CEX-17
CEX-20 | M5 | not available | waits on CEX-08, CEX-15, CEX-16, CEX-17, CEX-18, CEX-19
GNP-14 | M6 | available | all blockers done
GNP-15 | M6 | available | all blockers done
GNP-16 | M6 | available | all blockers done
GNP-17 | M6 | available | all blockers done
GNP-18 | M6 | not available | waits on GNP-16
GNP-19 | M6 | not available | waits on GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, CEX-09, GRR-17
GNP-21 | M7 | available | all blockers done
GNP-22 | M7 | available | all blockers done
GNP-23 | M7 | not available | waits on GNP-15, GNP-16, GNP-21, GNP-22
GNP-24 | M7 | not available | waits on GNP-19, GNP-21, GNP-22, GNP-23
SHL-17 | M7 | available | all blockers done
SHL-18 | M7 | available | all blockers done
SHL-19 | M7 | not available | waits on SHL-17, SHL-18
AGL-21 | M7 | available | all blockers done
AGL-22 | M7 | available | all blockers done
AGL-23 | M7 | not available | waits on AGL-21, AGL-22
AGL-24 | M7 | not available | waits on CEX-09, CEX-15
PST-23 | M7 | available | all blockers done
