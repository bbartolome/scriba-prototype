---
id: SAU-16
title: Setup-flow gate — e2e setup leg through /setup, M2 demo
module: setup-auth
phase: phase:setup-flow
milestone: M2
blocked_by: [SAU-11, SAU-12, SAU-13, SAU-14, SAU-15]
parallel_with: [SAU-17, SAU-18, SAU-19]
unblocks: []
---

# SAU-16 — Setup-flow gate

Merging this **closes Setup & auth `phase:setup-flow`**.

## Scope
- **Extend Platform's e2e:** the setup → project-from-sample leg runs through `/setup`'s first-project step (until now, the e2e's project-from-sample step used the Project store's own picker).

## Acceptance criteria (the `phase:setup-flow` checklist)
- [ ] A fresh library walks through all five steps; skipping providers and preferences still allows completion, and they show `skipped`.
- [ ] Re-running `/setup` shows every saved value as a default; saving one step changes only that step's fields (settings files differ only there; projects unchanged).
- [ ] The first-project step creates a project from the nonfiction sample via the Project store API; on a re-run it lists existing projects and creates nothing unless asked.
- [ ] The providers step renders the Model providers component and duplicates no forms.
- [ ] With `SCRIBA_COMPOSE_VERSION` unset or older, `/setup` and settings show the warning with the one-liner; matching → no warning.
- [ ] The e2e setup leg passes in CI.

## Demo (under 5 min)
Open the setup URL, pick an Ollama model in the embedded providers step, set the author name, start from the nonfiction sample and land in the project. Re-open `/setup` and see every answer prefilled. Change only the default genre pack and confirm nothing else changed in `settings.yaml`. Edit `.env` to an old compose version, restart, see the warning.
