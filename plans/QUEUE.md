# Unit queue (generated 2026-11-16 from main): plan-less units in sequence; first unfinished milestone M2
TRG-15 | M2 | no | waits for TRG-14 (planned)
TRG-17 | M2 | no | waits for TRG-14 (planned), TRG-15
AGL-16 | M3 | yes | all blockers done on main
AGL-17 | M3 | no | waits for AGL-16
AGL-19 | M3 | yes | all blockers done on main
PST-17 | M3 | yes | all blockers done on main
PST-18 | M3 | yes | all blockers done on main
PST-19 | M3 | yes | all blockers done on main
PST-20 | M3 | no | waits for PST-17
PST-21 | M3 | no | waits for PST-18
PST-22 | M3 | no | waits for PST-17, PST-18, PST-19, PST-20, PST-21
AGL-15 | M3 | no | waits for AGL-14 (planned), PST-22
AGL-20 | M3 | no | waits for AGL-15, AGL-16, AGL-17, AGL-19
SAU-18 | M3 | yes | all blockers done on main
SAU-19 | M3 | no | waits for SAU-18
SAU-20 | M3 | yes | all blockers done on main
SAU-21 | M3 | no | waits for SAU-18, SAU-19, SAU-20
GRR-02 | M4 | yes | all blockers done on main
GRR-03 | M4 | yes | all blockers done on main
GRR-04 | M4 | no | waits for GRR-02, GRR-03
GRR-05 | M4 | no | waits for GRR-04
GRR-06 | M4 | no | waits for GRR-04, PST-22
GRR-07 | M4 | no | waits for GRR-04
GRR-08 | M4 | no | waits for GRR-02, GRR-03, GRR-04, GRR-05, GRR-06, GRR-07, PST-22
GRR-09 | M4 | no | waits for GRR-02
GRR-10 | M4 | yes | all blockers done on main
GRR-11 | M4 | no | waits for GRR-03, GRR-10
GRR-12 | M4 | no | waits for GRR-11
GRR-13 | M4 | no | waits for GRR-04, GRR-05, GRR-06, GRR-11, PST-20
GRR-14 | M4 | no | waits for GRR-10
GRR-15 | M4 | no | waits for GRR-11, GRR-12, GRR-13, GRR-14
GRR-16 | M4 | yes | all blockers done on main
GRR-17 | M4 | no | waits for GRR-08, GRR-09, GRR-10, GRR-11, GRR-12, GRR-13, GRR-14, GRR-15, GRR-16
CEX-01 | M5 | yes | all blockers done on main
CEX-02 | M5 | no | waits for CEX-01
CEX-03 | M5 | no | waits for CEX-02
CEX-04 | M5 | no | waits for CEX-02
CEX-05 | M5 | no | waits for CEX-02
CEX-06 | M5 | no | waits for CEX-05
CEX-07 | M5 | no | waits for CEX-05
CEX-08 | M5 | no | waits for CEX-01
CEX-09 | M5 | no | waits for CEX-02, CEX-03, CEX-04, CEX-05, CEX-06, CEX-07, CEX-08
CEX-10 | M5 | no | waits for CEX-04, CEX-05, CEX-09
CEX-11 | M5 | no | waits for CEX-10
CEX-12 | M5 | no | waits for CEX-10
CEX-13 | M5 | no | waits for CEX-10
CEX-14 | M5 | no | waits for CEX-03, CEX-10
CEX-15 | M5 | no | waits for CEX-10, CEX-11, CEX-12, CEX-13, CEX-14
CEX-16 | M5 | no | waits for CEX-03
CEX-17 | M5 | no | waits for CEX-01
CEX-18 | M5 | no | waits for CEX-17, CEX-05, CEX-10, CEX-14
CEX-19 | M5 | no | waits for CEX-16, CEX-17
CEX-20 | M5 | no | waits for CEX-08, CEX-15, CEX-16, CEX-17, CEX-18, CEX-19, PST-22
GNP-13 | M6 | yes | all blockers done on main
GNP-14 | M6 | no | waits for GNP-13
GNP-15 | M6 | no | waits for GNP-13
GNP-16 | M6 | no | waits for GNP-13
GNP-17 | M6 | no | waits for GNP-13
GNP-18 | M6 | no | waits for GNP-13, GNP-16
GNP-19 | M6 | no | waits for GNP-13, GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, CEX-09, GRR-17
GNP-20 | M7 | yes | all blockers done on main
GNP-21 | M7 | yes | all blockers done on main
GNP-22 | M7 | yes | all blockers done on main
GNP-23 | M7 | no | waits for GNP-15, GNP-16, GNP-21, GNP-22
GNP-24 | M7 | no | waits for GNP-19, GNP-20, GNP-21, GNP-22, GNP-23
SHL-17 | M7 | yes | all blockers done on main
SHL-18 | M7 | yes | all blockers done on main
SHL-19 | M7 | no | waits for SHL-17, SHL-18, PST-22
AGL-21 | M7 | yes | all blockers done on main
AGL-22 | M7 | yes | all blockers done on main
AGL-23 | M7 | no | waits for AGL-20, AGL-21, AGL-22
AGL-24 | M7 | no | waits for CEX-09, CEX-15
PST-23 | M7 | yes | all blockers done on main
