---
id: MPR-09
title: Exported providers panel — list, add from preset, edit form, model picker, write-only key field, app default
module: providers
phase: phase:settings-ui
milestone: M2
blocked_by: [MPR-06, "Frontend shell phase:core (SHL-09)"]
parallel_with: [MPR-12]
unblocks: [MPR-10, MPR-11]
---

# MPR-09 — Providers panel

## Why
Presets (10), any OpenAI-compatible URL (11), several providers (12), paste a key once and see it masked (13–15), tune per provider with sensible defaults (19–20), app default (21), same screen in `/setup` (26).

## Decisions
- A **standalone Angular component** in `apps/web/src/app/features/providers/`, exported for Setup & auth's `/setup` providers step; no dependency on the settings route.
- Contents: provider list; **add from preset** (Ollama, LM Studio, OpenAI, OpenRouter) or custom URL; edit form (baseURL, model, temperature, contextSize, maxTokens, timeout, retries, defaults prefilled); **model picker** — dropdown from the model list, switching to a free-text field with a short explanation when the list fails; **key field** — password input, write-only, shows masked hint when set, "replace" and "remove" actions; **app default selector**; delete with the 409 refusal shown as "pick another default first".
- Built with Angular Material and the Shell's API client; usable at phone width for checking and switching the default.

## Acceptance criteria (Vitest + Shell fake API)
- [x] Adding OpenRouter from its preset, pasting a key and saving shows the key masked; reloading never shows the full key (no response contains it).
- [x] The model picker lists models; when the list fails it switches to free text with an explanation.
- [x] Deleting the app-default provider shows the refusal message.
- [x] The panel renders inside a host page with no dependency on the settings route.
