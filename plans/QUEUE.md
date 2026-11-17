# Queue
Written by the scout at main commit 232dd45 (current state). Lists only units with no plan file, in queue order.
First incomplete milestone: M1 (its only not-done unit is SAU-22, plan status draft, which has a plan file and is not listed). Demo units of M1: AGL-08, MPR-08, PLT-11, PLT-18, PST-12, SAU-08, SHL-09. M1 has no plan-less units, so the queue starts at M2 (next incomplete milestone).
TRG-15 | M2 | available: no | waits on not-done TRG-14
TRG-17 | M2 | available: no | waits on not-done TRG-14, TRG-15
GRR-04 | M4 | available: yes | all blocked_by units done
GRR-05 | M4 | available: no | waits on not-done GRR-04
GRR-06 | M4 | available: no | waits on not-done GRR-04
GRR-07 | M4 | available: no | waits on not-done GRR-04
GRR-08 | M4 | available: no | waits on not-done GRR-04, GRR-05, GRR-06, GRR-07
GRR-09 | M4 | available: yes | all blocked_by units done
GRR-10 | M4 | available: yes | all blocked_by units done
GRR-11 | M4 | available: no | waits on not-done GRR-10
GRR-12 | M4 | available: no | waits on not-done GRR-11
GRR-13 | M4 | available: no | waits on not-done GRR-04, GRR-05, GRR-06, GRR-11
GRR-14 | M4 | available: no | waits on not-done GRR-10
GRR-15 | M4 | available: no | waits on not-done GRR-11, GRR-12, GRR-13, GRR-14
GRR-16 | M4 | available: yes | all blocked_by units done
GRR-17 | M4 | available: no | waits on not-done GRR-08, GRR-09, GRR-10, GRR-11, GRR-12, GRR-13, GRR-14, GRR-15, GRR-16
CEX-01 | M5 | available: yes | all blocked_by units done
CEX-02 | M5 | available: no | waits on not-done CEX-01
CEX-03 | M5 | available: no | waits on not-done CEX-02
CEX-04 | M5 | available: no | waits on not-done CEX-02
CEX-05 | M5 | available: no | waits on not-done CEX-02
CEX-06 | M5 | available: no | waits on not-done CEX-05
CEX-07 | M5 | available: no | waits on not-done CEX-05
CEX-08 | M5 | available: no | waits on not-done CEX-01
CEX-09 | M5 | available: no | waits on not-done CEX-02, CEX-03, CEX-04, CEX-05, CEX-06, CEX-07, CEX-08
CEX-10 | M5 | available: no | waits on not-done CEX-04, CEX-05, CEX-09
CEX-11 | M5 | available: no | waits on not-done CEX-10
CEX-12 | M5 | available: no | waits on not-done CEX-10
CEX-13 | M5 | available: no | waits on not-done CEX-10
CEX-14 | M5 | available: no | waits on not-done CEX-03, CEX-10
CEX-15 | M5 | available: no | waits on not-done CEX-10, CEX-11, CEX-12, CEX-13, CEX-14
CEX-16 | M5 | available: no | waits on not-done CEX-03
CEX-17 | M5 | available: no | waits on not-done CEX-01
CEX-18 | M5 | available: no | waits on not-done CEX-17, CEX-05, CEX-10, CEX-14
CEX-19 | M5 | available: no | waits on not-done CEX-16, CEX-17
CEX-20 | M5 | available: no | waits on not-done CEX-08, CEX-15, CEX-16, CEX-17, CEX-18, CEX-19
GNP-13 | M6 | available: yes | all blocked_by units done
GNP-14 | M6 | available: no | waits on not-done GNP-13
GNP-15 | M6 | available: no | waits on not-done GNP-13
GNP-16 | M6 | available: no | waits on not-done GNP-13
GNP-17 | M6 | available: no | waits on not-done GNP-13
GNP-18 | M6 | available: no | waits on not-done GNP-13, GNP-16
GNP-19 | M6 | available: no | waits on not-done GNP-13, GNP-14, GNP-15, GNP-16, GNP-17, GNP-18, CEX-09, GRR-17
GNP-20 | M7 | available: yes | all blocked_by units done
GNP-21 | M7 | available: yes | all blocked_by units done
GNP-22 | M7 | available: yes | all blocked_by units done
GNP-23 | M7 | available: no | waits on not-done GNP-15, GNP-16, GNP-21, GNP-22
GNP-24 | M7 | available: no | waits on not-done GNP-19, GNP-20, GNP-21, GNP-22, GNP-23
SHL-17 | M7 | available: yes | all blocked_by units done
SHL-18 | M7 | available: yes | all blocked_by units done
SHL-19 | M7 | available: no | waits on not-done SHL-17, SHL-18
AGL-21 | M7 | available: yes | all blocked_by units done
AGL-22 | M7 | available: yes | all blocked_by units done
AGL-23 | M7 | available: no | waits on not-done AGL-21, AGL-22
AGL-24 | M7 | available: no | waits on not-done CEX-09, CEX-15
PST-23 | M7 | available: yes | all blocked_by units done
