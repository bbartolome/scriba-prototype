# ADR 0001: Tailscale Serve mechanism

Status: draft. The manual ST-1 run is not complete, and no variant is shipped. Attempt A failed, and Attempt B failed the mechanism retest.

## Context

ST-1 needs the app at `https://scriba.<tailnet>.ts.net` with a valid certificate, and the login is done late, after the stack starts. The Tailscale sidecar can configure Serve in two ways. Variant A is the config file `deploy/serve/serve.json`, which `TS_SERVE_CONFIG` loads. It failed under the shipped compose, so it is not shipped. Variant B is the CLI loop: after containerboot waits for an IP, run `tailscale serve --bg --https=443 http://127.0.0.1:8080`. The variant that passes ships, and `deploy/compose.yaml` matches it.

## Attempt A: TS_SERVE_CONFIG

Config: `deploy/serve/serve.json`, loaded through `TS_SERVE_CONFIG: /config/serve/serve.json` in `deploy/compose.yaml` up to commit `c75948c`. Both are removed with variant B. The removed file is at `git show 0dd5234:deploy/serve/serve.json`.

Result: failed (late login: with no auth key, containerboot gave up after about 60 s and the sidecar restarted; `scriba` kept the network namespace of the old sidecar, and host `/healthz` on 18080 returned 000)

Evidence: smoke run on `plt16-check` (DECISIONS lines 1061 to 1062; the decision at lines 1076 to 1082). `RestartCount` was 8 at 05:07 UTC, `scriba` `StartedAt` was 04:59:01 UTC, and host `/healthz` on 18080 returned 000 at 05:07 UTC. At planning time of PLT-16 revision 2, `RestartCount` was 647 (read-only `docker inspect`). Each restart printed a new login URL, which is not recorded here.

## Attempt B: CLI loop

Design (PLT-16 plan revision 2, section 1a): containerboot stays the foreground process, through `exec`. A background loop waits for an IP with no timeout, then runs `tailscale serve reset` and `tailscale serve --bg --https=443 http://127.0.0.1:8080` once. `TS_BOOT_TIMEOUT: 8760h` lifts containerboot's boot deadline (assumed; the retest read no restart 61 s after start, and its later reads did not run). `TS_SERVE_CONFIG` and `deploy/serve/` are removed.

Result: failed (mechanism retest, C6 stop rule: the M3 host read at t0 was 000, connection refused; the cause is not established, see Evidence)

Evidence: `docker compose up -d --wait` (project `plt16-check`, image `bbartolome/scriba:plt16-check` built from `unit/PLT-16` at `47026a1`) returned 0 at t0 = 2026-11-13T16:28:07Z. M1 at 16:28:31Z: `restarts=0`, `started=2026-11-13T16:28:01.395848386Z`, `running=true`; a re-read at 16:29:02Z (61 s after the start) gave the same values. M2 at 16:28:31Z: `tailscale ip -4` printed no IP (its message went to stderr, exit 1), `tailscale serve status` printed `No serve config`, and the LocalAPI status of step 12a printed `NeedsLogin`. M3 at 16:28:31Z: scriba `healthy`, `/healthz` in `scriba` 200, and host `127.0.0.1:18080/healthz` 000 (curl exit 7, connection refused); the host read was 000 again at 16:29:01Z. A `--network host` container got `HTTP/1.1 200 OK` for `http://127.0.0.1:18080/healthz` at 16:29:19Z. The shell that ran the host read has no listener on port 18080 in its own network namespace (no such socket in `/proc/net/tcp`), so that read does not show whether the publish is up. M4 at 16:28:31Z: 2 login URL lines. The reads at +60, +120 and +180 s did not run, because the stop rule fired at t0.

## Decision

Shipped variant: pending (candidate: B, the CLI loop; B ships only after 1c-HTTPS and 1c-restart pass)

## Peer addresses

Published path (the loopback publish, read in `scriba`): pending.

Serve path (read during an open `/events` request): pending.

The `/proc/net/tcp` words are little-endian. `0100007F` is 127.0.0.1.

## Consequences

- The compose version is `2` with variant B. `deploy/compose-version` and `EXPECTED_COMPOSE_VERSION` moved from `1` to `2` together, and a different variant would change both again.
- SAU-21 adds its socket smoke line to the pre-release checklist in `deploy/RUNBOOK.md`. It assumes the Serve peer is 127.0.0.1.
- PLT-08 uses the peer addresses on both paths to check its tailnet filter.
- SAU-18 trigger: if a loopback peer appears on the published path, the rule of SAU-18 would accept the identity header from a path that is not Serve. The Navigator decides before SAU-18 merges.
- Stale network namespace: a restart of the sidecar by any cause, not only the 60-second give-up, leaves `scriba` (`network_mode: service:tailscale`) in the old network namespace behind a healthy healthcheck (Attempt A evidence). Docker's restart policy restarts `tailscale` alone. Whether `depends_on` with `restart: true` covers this is not checked. The Navigator or PLT-18 decides whether a healthcheck, a watchdog or a restart rule covers it. This is not a PLT-16 criterion.
