# ADR 0001: Tailscale Serve mechanism

Status: draft. The manual ST-1 run is not complete, so the results below are pending.

## Context

ST-1 needs the app at `https://scriba.<tailnet>.ts.net` with a valid certificate, and the login is done late, after the stack starts. The Tailscale sidecar can configure Serve in two ways. Variant A is the shipped config file `deploy/serve/serve.json`, which `TS_SERVE_CONFIG` loads. Variant B is the CLI loop: after containerboot waits for an IP, run `tailscale serve --bg --https=443 http://127.0.0.1:8080`. The variant that passes ships, and `deploy/compose.yaml` matches it.

## Attempt A: TS_SERVE_CONFIG

Config: `deploy/serve/serve.json`, loaded through `TS_SERVE_CONFIG: /config/serve/serve.json` in `deploy/compose.yaml`.

Result: pending

Evidence: pending. The run records `t0`, `t1`, `t1 - t0` (at most 60 s), the restart result and the date.

## Attempt B: CLI loop

Not run. Attempt B is written up only if attempt A fails.

Result: pending

## Decision

Shipped variant: pending

## Peer addresses

Published path (the loopback publish, read in `scriba`): pending.

Serve path (read during an open `/events` request): pending.

The `/proc/net/tcp` words are little-endian. `0100007F` is 127.0.0.1.

## Consequences

- The compose version stays `1` if attempt A passes. A different variant would change `deploy/compose-version` and `EXPECTED_COMPOSE_VERSION` together.
- SAU-21 adds its socket smoke line to the pre-release checklist in `deploy/RUNBOOK.md`. It assumes the Serve peer is 127.0.0.1.
- PLT-08 uses the peer addresses on both paths to check its tailnet filter.
- SAU-18 trigger: if a loopback peer appears on the published path, the rule of SAU-18 would accept the identity header from a path that is not Serve. The Navigator decides before SAU-18 merges.
