# Smoke runbook

These are the manual pre-release checks for tailnet and host-network behaviour: ST-1 (late login with HTTPS Serve), ST-2 (SSE through Serve) and ST-3 (host Ollama). They need real hardware and a real tailnet, so CI does not run them. Record the outcome of ST-1 in `docs/adr/0001-tailscale-serve-mechanism.md`, and the outcome of the others in the pre-release checklist below.

Run commands from the install folder (the `deploy/` tree with its `.env`), and use `<install folder>` for its path.

## Prerequisites for the tailnet run

- Docker Desktop (Mac) or Docker Engine (Linux), with Docker Compose. The run that set this up used Docker Desktop 29.8.2 and Compose v5.6.0.
- A tailnet with MagicDNS on and HTTPS certificates enabled.
- A `.env` in the install folder with `SCRIBA_LIBRARY`, `SCRIBA_UID`, `SCRIBA_GID`, `SCRIBA_PORT`, `SCRIBA_IMAGE_TAG` and `SCRIBA_COMPOSE_VERSION`. Do not create a `.secret` file: the ST-1 login is done later, through the auth URL.
- A second tailnet device, for the refusal checks in ST-1.
- Ollama on the host, for ST-3.

## Ollama on Linux

Scriba reaches host Ollama as `host.docker.internal`, which resolves to the Docker bridge gateway. Ollama listens on 127.0.0.1 by default, so the gateway cannot reach it. Set `OLLAMA_HOST=0.0.0.0` in the environment of the Ollama service on this host, then restart Ollama. This also listens on the LAN, so block port 11434 in the firewall on a shared network. The installer prints the same text from `deploy/installer-hint.txt`.

## ST-1: late login with HTTPS Serve

Goal: the stack starts with no auth key and the app is healthy on loopback. After a login through the auth URL, within one minute `https://<DNS>/healthz` answers 200 with a valid certificate. It must still do so after `docker compose restart`. `http://scriba` and `http://<100.x>:8080` must fail from another tailnet device.

Variant A is `TS_SERVE_CONFIG`, which loaded `deploy/serve/serve.json`. It failed under the shipped compose (the late-login failure recorded in the ADR, Attempt A), so it is not shipped. Variant B is the CLI loop, which `deploy/compose.yaml` sets: containerboot runs with `TS_BOOT_TIMEOUT: 8760h`, and after it waits for an IP, `tailscale serve --bg --https=443 http://127.0.0.1:8080` runs. If B fails, record the failure in the ADR and stop. The variant that passes ships, and the ADR records it.

1. Start the stack with `docker compose --project-directory "<install folder>" up -d --wait`. Check that `docker compose --project-directory "<install folder>" config | grep -c TS_SERVE_CONFIG` prints `0`, and that `docker compose --project-directory "<install folder>" config | grep -E 'TS_BOOT_TIMEOUT|command:'` prints the `TS_BOOT_TIMEOUT` line and the `command:` line.
2. Read the login state from inside `scriba`, as its non-root user. It prints `200 NeedsLogin` before login.

```sh
docker compose --project-directory "<install folder>" exec -T scriba node -e "const h=require('http');h.get({socketPath:'/var/run/tailscale/tailscaled.sock',path:'/localapi/v0/status',headers:{Host:'local-tailscaled.sock'}},(r)=>{let d='';r.on('data',(c)=>{d+=c});r.on('end',()=>{const s=JSON.parse(d);const ips=(s.Self&&s.Self.TailscaleIPs)||[];const dns=((s.Self&&s.Self.DNSName)||'').replace(/\.$/,'');console.log(s.BackendState,dns,ips.join(' '))})})"
```

3. Get the auth URL with `docker compose --project-directory "<install folder>" logs tailscale 2>&1 | grep -o 'https://login.tailscale.com/[^ ]*' | tail -1`, and approve the machine at that URL. This is the only step a person takes.
4. Timed check. Note `t0`, the epoch second (`date +%s`) of the first read that prints `Running`. From then, every 2 seconds, run `curl -sS -m 5 -o /dev/null -w '%{http_code}\n' --resolve '<DNS>:443:<IP4>' https://<DNS>/healthz` until it prints `200`. Note `t1`, the epoch second of that `200`. `t1 - t0` must be at most 60. Record `t0`, `t1` and the difference in the ADR's Attempt B `Evidence:`. If `t1 - t0` is more than 60, Attempt B fails: record that in its `Result:` and stop. `<DNS>` is the `*.ts.net` name without its trailing dot, and `<IP4>` is the IPv4 address from the same read.
5. Restart: `docker compose --project-directory "<install folder>" restart`, then the check of step 4 must print `200` within 60 seconds.
6. Refusals, from another tailnet device: `curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://scriba/healthz` and `curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://<100.x>:8080/healthz` must both fail with a connection error (`000`).
7. Peer addresses. Read the sockets of the app port in `scriba`, with the rows in state 01 (ESTABLISHED) and local port 1F90 (8080), on the published path and on the Serve path during an open request to `/events`:

```sh
docker compose --project-directory "<install folder>" exec -T scriba sh -c 'cat /proc/net/tcp /proc/net/tcp6' | awk '$4=="01" && $2 ~ /:1F90$/ {print "local=" $2 " rem=" $3}'
```

Each address is a little-endian hex word: `0100007F` is 127.0.0.1, and `00000000000000000000000001000000` is `::1`. On the published path, no remote address may be in `100.64.0.0/10`, and none may be loopback. On the Serve path, the remote is 127.0.0.1. Record both in the ADR's `## Peer addresses`. A loopback remote on the published path is the trigger in the ADR's Consequences.

## ST-2: SSE through Serve is unbuffered, over HTTP/2

Goal: over the tailnet URL, each `platform/echo` event arrives on `/events` within about 250 ms of its `sentAt`, and the events arrive about 1000 ms apart, not in a batch. Echoes published before a subscriber connects are lost, so the order is: check HTTP/2, start the reader, wait 2 seconds, POST, wait 14 seconds, then analyse.

1. `curl --http2 -s -m 10 -o /dev/null -w '%{http_version}\n' --resolve '<DNS>:443:<IP4>' https://<DNS>/healthz` prints `2`.
2. In the background, read the stream and stamp each `data:` line with the time it arrives. Save the output to a file in `/tmp`:

```sh
curl --http2 -sN -m 25 --resolve '<DNS>:443:<IP4>' https://<DNS>/events | node -e 'require("readline").createInterface({input:process.stdin}).on("line",(l)=>{if(l.startsWith("data: "))console.log(Date.now(),l)})' > /tmp/st2-events.txt &
```

3. `sleep 2`, then POST the echo request. It prints `202 2`:

```sh
curl --http2 -s -m 10 -o /dev/null -w '%{http_code} %{http_version}\n' --resolve '<DNS>:443:<IP4>' -H 'Content-Type: application/json' -d '{"count":10,"intervalMs":1000}' https://<DNS>/api/platform/echo
```

4. `sleep 14`, then analyse the file:

```sh
node -e 'const fs=require("fs");const e=fs.readFileSync(process.argv[1],"utf8").split("\n").filter((l)=>l.includes("\"type\":\"echo\"")).map((l)=>{const i=l.indexOf(" data: ");return {arr:Number(l.slice(0,i)),sent:Date.parse(JSON.parse(l.slice(i+7)).data.sentAt)}});console.log("echoes",e.length);console.log("lag_ms",e.map((x)=>x.arr-x.sent).join(" "));console.log("gap_ms",e.slice(1).map((x,i)=>x.arr-e[i].arr).join(" "))' /tmp/st2-events.txt
```

Pass: `echoes 10`, every `lag_ms` from 0 to 250, and every `gap_ms` between 750 and 1250. A run where the ten echoes arrive within a few milliseconds of each other is batched, and it fails even when the lags pass.

The same analysis over `http://host.docker.internal:<SCRIBA_PORT>` checks the application's own stream, over HTTP/1.1. It does not show that Serve is unbuffered or that the path uses HTTP/2.

## ST-3: host Ollama from inside scriba

Goal: from inside `scriba`, `fetch('http://host.docker.internal:11434/v1/models')` returns 200.

- Mac (Docker Desktop): with Ollama running on the Mac, the fetch returns `200`. `/etc/hosts` in `scriba` has one IPv4 `host.docker.internal` line.
- Linux (Docker Engine), negative control: with Ollama on 127.0.0.1 only, the same fetch must fail.
- Linux, after the setting of "Ollama on Linux" is applied and Ollama restarted: the fetch must return `200`.

```sh
docker compose --project-directory "<install folder>" exec -T scriba node -e "fetch('http://host.docker.internal:11434/v1/models').then(r=>console.log(r.status),(e)=>{console.log('ERR '+(e.cause&&e.cause.code||e.message));process.exit(1)})"
```

## SAU-21: socket and real-tailnet checks

Goal: the app's non-root UID can reach tailscaled's LocalAPI socket (criterion 6), and late login makes the tailnet URL work without a restart (criterion 5). The stack is the test stack `sau21-check`. Every command passes `-p sau21-check --project-directory /tmp/sau21-install`, written `<P>` below, so the owner's stack is never touched.

The app reads tailscaled's status through the shared socket, and it only sends GET requests. The socket gives access to tailscaled's local API, through which a process can log the node out, change its preferences or edit the Serve configuration. So a compromised app process could disconnect the node or re-point it. The read-only mount of the socket volume does not prevent this. This is accepted for a single owner. The SAU-21 write check (S3) records whether tailscaled accepts writes from the app's UID.

- **T0. Image.** `git clone --branch unit/SAU-21 <repo> /tmp/sau21-fresh`, then `cd /tmp/sau21-fresh && docker build -t bbartolome/scriba:sau21-check .`. Record `git -C /tmp/sau21-fresh rev-parse --short HEAD`.
- **T1. Install folder.** `/tmp/sau21-install`: copies of `deploy/compose.yaml`, `deploy/compose-version` and `deploy/installer-hint.txt`, a library folder `/tmp/sau21-install/books`, and a `.env` with `SCRIBA_LIBRARY="/tmp/sau21-install/books"`, `SCRIBA_UID=1001`, `SCRIBA_GID=1001`, `SCRIBA_PORT=18082`, `SCRIBA_IMAGE_TAG=sau21-check` and `SCRIBA_COMPOSE_VERSION=2`. No `.secret`, so the node starts logged out.
- **T2. Start.** `docker compose -p sau21-check --project-directory /tmp/sau21-install up -d --wait`. Expected: exit 0, `scriba` healthy.

Socket smoke test (criterion 6), on each host:

- **S1.** `docker compose <P> exec -T scriba id -u` prints `1001`, not `0`.
- **S2.** `docker compose <P> exec -T scriba node -e "const h=require('http');h.get({socketPath:'/var/run/tailscale/tailscaled.sock',path:'/localapi/v0/status',headers:{Host:'local-tailscaled.sock'}},(r)=>{let d='';r.on('data',(c)=>{d+=c});r.on('end',()=>console.log(r.statusCode,JSON.parse(d).BackendState))}).on('error',(e)=>{console.error(e.code);process.exit(1)})"`. Expected: `200 NeedsLogin`. If it prints `NoState` or `Starting`, retry for up to 60 s.
- **S3. Write endpoints, for information.** A write request whose body cannot parse, so nothing changes even if writes are allowed: `docker compose <P> exec -T scriba node -e "const h=require('http');const q=h.request({socketPath:'/var/run/tailscale/tailscaled.sock',method:'PATCH',path:'/localapi/v0/prefs',headers:{Host:'local-tailscaled.sock','Content-Type':'application/json'}},(r)=>{let d='';r.on('data',(c)=>{d+=c});r.on('end',()=>console.log(r.statusCode,d.trim().slice(0,80)))});q.on('error',(e)=>{console.error(e.code);process.exit(1)});q.end('x')"`. 403 means writes are refused for this UID; 400 means the write was allowed and refused only for the bad body. Record the printed line, then repeat S2 to confirm the state did not change.

Real tailnet (criterion 5):

- **R1.** Login state, without printing the login URL: the S2 command with the `end` handler replaced by `const s=JSON.parse(d);console.log(r.statusCode,s.BackendState,'authURL='+Boolean(s.AuthURL),((s.Self&&s.Self.DNSName)||'').replace(/\.$/,''),((s.Self&&s.Self.TailscaleIPs)||[]).join(' '))`. Expected before login: `200 NeedsLogin authURL=true`. Note `StartedAt0` from `docker inspect -f '{{.State.StartedAt}}' sau21-check-scriba-1`.
- **R2. Login, a person's step.** Open the setup URL (`cat /tmp/sau21-install/books/.scriba/setup-url`) in a browser on the Mac, go to `/settings`, click the Tailscale login link the page shows, and approve. The tailnet must have MagicDNS and HTTPS certificates on.
- **R3.** Repeat R1 every 2 s until it reads `Running` with a DNS name. Note `t0` (epoch second of the first `Running` read), `<DNS>` and `<IP4>`.
- **R4. Host forwarding, identity and stripping.** Run from another tailnet node, `docker run --rm --network container:installer-tailscale-1 bbartolome/tools:latest curl ...`, or from a person's tailnet device. Record which.
  - (a) `curl -sS -m 5 -w ' %{http_code}\n' --resolve '<DNS>:443:<IP4>' https://<DNS>/api/platform/version`, with no cookie. 200 with the version body means Serve forwarded the tailnet Host and injected a login. 403 `AUTH_TAILNET_IDENTITY_MISSING` means the Host was admitted but no login came (a tagged reader node). 401 `AUTH_REQUIRED` or 403 `AUTH_HOST_REJECTED` means the Host was not forwarded.
  - (b) `curl -sS -m 5 -w ' %{http_code}\n' --resolve '<DNS>:443:<IP4>' -H 'Tailscale-User-Login: spoof.invalid' https://<DNS>/api/setup-auth/identity`. Pass: the body is `{"via":"tailnet","login":"<a real login>"}`, not `spoof.invalid`, or 403 `AUTH_TAILNET_IDENTITY_MISSING` from a tagged reader. If the reader is tagged, repeat (b) from a user-owned device and record that result.
- **R5. Peer addresses on the current image.** The ST-1 step 7 read (above) twice. Published path: `docker run --rm --network host busybox sh -c 'sleep 6 | nc 127.0.0.1 18082'` in the background, and read the sockets during it. Serve path: `curl -sN -m 6 --resolve '<DNS>:443:<IP4>' https://<DNS>/events` from the R4 reader, and read during it. Ignore the healthcheck rows (`0100007F`). Expected: the published remote is neither loopback nor in `100.64.0.0/10`; the Serve remote is `127.0.0.1`.
- **R6. No restart, within the budget.** From `t0`, run R4(a) every 2 s until it prints 200 (or 403 `AUTH_TAILNET_IDENTITY_MISSING` from a tagged reader). Note `t1`; `t1 - t0` must be at most 60. Then `docker inspect -f '{{.State.StartedAt}}' sau21-check-scriba-1` must equal `StartedAt0`.

Teardown: `docker compose -p sau21-check --project-directory /tmp/sau21-install down -v`, then remove `/tmp/sau21-fresh` and `/tmp/sau21-install`. The test machine stays in the tailnet's machine list until the person removes it.

## ST-4 (userspace networking)

ST-4 is deferred: this runbook covers kernel mode only, which `deploy/compose.yaml` sets with `TS_USERSPACE: 'false'`.

## Pre-release checklist

| Check                                           | Where it runs        | Status                                                                                                                                                                                                                 |
| ----------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST-1 late login, HTTPS within 60 s, restart     | Real tailnet, manual | Variant B in compose; mechanism passed; login approval given; 1c-HTTPS (37 s), 1c-restart passed; no NeedsLogin read. `docs/adr/0001-tailscale-serve-mechanism.md`                                                     |
| ST-1 refusals and peer addresses                | Real tailnet, manual | 2b, 2d recorded: peer 172.22.0.1 (published), 127.0.0.1 (Serve). 2c deferred (N5): name check and DNS failed. 2e passed (reported by the operator): both plain-HTTP URLs failed to connect from another tailnet device |
| ST-2 SSE over the tailnet URL, HTTP/2           | Real tailnet, manual | 3b passed: HTTP/2 over the tailnet URL; ten echoes, lags 13 to 20 ms, gaps 995 to 1009 ms (ADR Attempt B Evidence)                                                                                                     |
| ST-3 host Ollama, Mac (Docker Desktop)          | Mac, manual          | Mac leg passed locally under N3 (DECISIONS smoke run, step 9)                                                                                                                                                          |
| ST-3 host Ollama, Linux (Docker Engine)         | Linux host, manual   | Deferred under N3: Linux Docker Engine host not reachable                                                                                                                                                              |
| SAU-21 socket smoke test, Mac (Docker Desktop)  | Mac, manual          | not run                                                                                                                                                                                                                |
| SAU-21 socket smoke test, Linux (Docker Engine) | Linux host, manual   | not run                                                                                                                                                                                                                |
