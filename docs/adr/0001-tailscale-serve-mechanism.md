# ADR 0001: Tailscale Serve mechanism

Status: draft. The manual ST-1 run is not complete, and no variant is shipped. Attempt A failed. Attempt B passed the mechanism retest; its HTTPS and restart checks wait for the login approval.

## Context

ST-1 needs the app at `https://scriba.<tailnet>.ts.net` with a valid certificate, and the login is done late, after the stack starts. The Tailscale sidecar can configure Serve in two ways. Variant A is the config file `deploy/serve/serve.json`, which `TS_SERVE_CONFIG` loads. It failed under the shipped compose, so it is not shipped. Variant B is the CLI loop: after containerboot waits for an IP, run `tailscale serve --bg --https=443 http://127.0.0.1:8080`. The variant that passes ships, and `deploy/compose.yaml` matches it.

## Attempt A: TS_SERVE_CONFIG

Config: `deploy/serve/serve.json`, loaded through `TS_SERVE_CONFIG: /config/serve/serve.json` in `deploy/compose.yaml` up to commit `c75948c`. Both are removed with variant B. The removed file is at `git show 0dd5234:deploy/serve/serve.json`.

Result: failed (late login: with no auth key, containerboot gave up after about 60 s and the sidecar restarted; `scriba` kept the network namespace of the old sidecar, and host `/healthz` on 18080 returned 000)

Evidence: smoke run on `plt16-check` (DECISIONS lines 1061 to 1062; the decision at lines 1076 to 1082). `RestartCount` was 8 at 05:07 UTC, `scriba` `StartedAt` was 04:59:01 UTC, and host `/healthz` on 18080 returned 000 at 05:07 UTC. At planning time of PLT-16 revision 2, `RestartCount` was 647 (read-only `docker inspect`). Each restart printed a new login URL, which is not recorded here.

## Attempt B: CLI loop

Design (PLT-16 plan revision 2, section 1a): containerboot stays the foreground process, through `exec`. A background loop waits for an IP with no timeout, then runs `tailscale serve reset` and `tailscale serve --bg --https=443 http://127.0.0.1:8080` once. `TS_BOOT_TIMEOUT: 8760h` lifts containerboot's boot deadline (assumed; the retest read no restart from t0 to t0+180 s, see Evidence). `TS_SERVE_CONFIG` and `deploy/serve/` are removed.

Result: passed (mechanism only; login approval pending)

Evidence: `docker compose up -d --wait` (project `plt16-check`, image `bbartolome/scriba:plt16-check` built from `unit/PLT-16` at `9f76fcc`) returned 0 at t0 = 2026-11-13T16:40:32Z. The mechanism reads were taken at t0 + 13 s (16:40:45Z), t0+60 (16:41:32Z), t0+120 (16:42:32Z) and t0+180 (16:43:32Z). At each read: M1 `restarts=0`, `started=2026-11-13T16:40:26.353034259Z`, `running=true`. M2 `tailscale ip -4` printed 0 bytes, and `tailscale serve status` printed `No serve config`. M3 scriba `healthy`, `/healthz` in `scriba` 200, and host `127.0.0.1:18080/healthz` 200. M4 printed 2 login URL lines at every read (counts only; the URL is not recorded). The host read used a `busybox` container run with `--network host` on the same Docker daemon, the approved substitute reader; the shell that runs these commands cannot reach port 18080 and was not used for it. An earlier run, recorded at commit `9f76fcc` with a host read of 000 from that shell, is void: the read could not reach the published port, so it does not count as a failure. Post-approval run (plan step 12, on the same stack, after the login approval): the tailnet-facing requests ran in the network namespace of `installer-tailscale-1`, through `docker run --network container:installer-tailscale-1 bbartolome/tools:latest curl`, because this shell is not on the tailnet (a deviation from the plan's wording). Step 12a read `Running` at t0 = 1794600399 (2026-11-13T20:06:39Z), with CertDomains non-empty. The sidecar log shows the NeedsLogin state ending at 20:05:28Z; no NeedsLogin read was taken in this run. Step 12b: TCP 443 with HTTPS, and the Web handler `/` proxying to `http://127.0.0.1:8080`, as in the removed file except that the host key is the resolved name. 1c-HTTPS: the first request returned 200 (exit 0, no certificate error), with t1 = 1794600436 (20:07:16Z), so t1 - t0 = 37 s (at most 60): pass. 1c-restart: `compose restart` at R0 = 1794600458 (20:07:38Z), and the first request after it returned 200, about 2 s after R0 (the epoch stamp is taken before each request): pass. The sidecar log shows `Running` from the cached state at 20:07:38.54 and the Serve config re-applied by the CLI loop at 20:07:38.70, with no new login needed. 3b: the healthz over `curl --http2` returned 200 with HTTP version 2, and the events stream also negotiated version 2. ST-2 over the tailnet: the POST returned 202 with version 2; ten echo events arrived with lags of 13 to 20 ms and gaps of 995 to 1009 ms: pass. 2d: pass (see Peer addresses). 2c: `getent hosts scriba` in the tailnet namespace returned nothing, and plain DNS did not resolve the tailnet name there either, so the name half stays deferred (N5). Deferred: 1c-reboot (N2), the 2c name half (N5), and 4b (N3).

## Decision

Shipped variant: B, the CLI loop (1c-HTTPS and 1c-restart both passed on the post-approval run; see Attempt B Evidence)

## Peer addresses

Published path (the loopback publish, read in `scriba`): pending.

Serve path (read during an open `/events` request, plan step 12e on the tailnet run): loopback only. Before the stream there was one socket row with local `127.0.0.1:8080` and remote `127.0.0.1` (the healthcheck); during the open stream there were two such rows. The second row is taken to be the Serve proxy's connection, since the rows are counted, not separated per request. No remote is in `100.64.0.0/10`, which passes the Serve-path expectation. The Serve proxy connects from `127.0.0.1` (`0100007F`).

The `/proc/net/tcp` words are little-endian. `0100007F` is 127.0.0.1.

## Consequences

- The compose version is `2` with variant B. `deploy/compose-version` and `EXPECTED_COMPOSE_VERSION` moved from `1` to `2` together, and a different variant would change both again.
- SAU-21 adds its socket smoke line to the pre-release checklist in `deploy/RUNBOOK.md`. It assumes the Serve peer is 127.0.0.1.
- PLT-08 uses the peer addresses on both paths to check its tailnet filter.
- SAU-18 trigger: if a loopback peer appears on the published path, the rule of SAU-18 would accept the identity header from a path that is not Serve. The Navigator decides before SAU-18 merges.
- Stale network namespace: a restart of the sidecar by any cause, not only the 60-second give-up, leaves `scriba` (`network_mode: service:tailscale`) in the old network namespace behind a healthy healthcheck (Attempt A evidence). Docker's restart policy restarts `tailscale` alone. Whether `depends_on` with `restart: true` covers this is not checked. The Navigator or PLT-18 decides whether a healthcheck, a watchdog or a restart rule covers it. This is not a PLT-16 criterion.
