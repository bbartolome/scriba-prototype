---
id: MPR-02
title: Module skeleton, provider registry in settings.yaml, first-start Ollama seeding
module: providers
phase: phase:client
milestone: M1
blocked_by: [MPR-01, "Platform phase:scaffold (PLT-11)"]
parallel_with: [MPR-03, MPR-04]
unblocks: [MPR-05, MPR-06]
---

# MPR-02 — Registry and seeding

## Why
Ollama works with no configuration (stories 1–2); several providers at once (12); re-running setup never clobbers (27).

## Decisions
- Module skeleton at `apps/api/src/modules/providers/`, one `@Module` import in the composition root.
- Registers the **`providers`** section with Platform's hook: version 1, **default `null`** ("leave absent"), so seeding can distinguish "absent" from "empty list". Any future section migration is registered here.
- **First-start seeding:** when `settings.yaml` has no `providers` section, write one provider from the Ollama preset — id `ollama`, baseURL `http://host.docker.internal:11434/v1`, no key, empty model, defaults for the rest — and set `appDefault` to `{providerId: 'ollama', model: ''}`.
- Seeding is idempotent and **never clobbers**: an existing section (even a deliberately empty `list`) is left as is.
- `host.docker.internal` resolves because compose adds `extra_hosts: ["host.docker.internal:host-gateway"]` on the tailscale service and the app shares its namespace (verified by Platform's ST-3).
- Registry service (in-process): list, get, create (id = preset id or slug, with a suffix if taken), update, delete, set app default; all writes through Platform's atomic section write.

## Acceptance criteria
- [ ] On a fresh library, startup writes a `providers` section with `ollama` at `http://host.docker.internal:11434/v1`, no key, app default `ollama`; a second startup changes nothing.
- [ ] An existing section with an empty `list` is untouched at startup.
- [ ] A newer section `schemaVersion` is refused at startup per Platform's migration rules.
- [ ] Creating two providers from the same preset yields distinct stable ids.
