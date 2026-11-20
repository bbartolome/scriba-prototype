#!/usr/bin/env bash
# CEX-15 export smoke check, run once per architecture by the smoke job (after smoke-image.sh).
# Usage: export-smoke.sh <image-ref>
# Starts the image with a tmpfs library, runs one Node client inside the container through
# `docker exec -i ... node -`, and exports the nonfiction sample to md, docx, epub and pdf over HTTP.
# Prints one PASS or FAIL line per format. Exit 0 when all pass; 1 when the client fails or prints a FAIL
# line; 2 on bad usage (no docker call).
set -uo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: export-smoke.sh <image-ref>" >&2
  exit 2
fi
REF=$1
NAME="scriba-export-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT

if ! docker run -d --name "$NAME" --tmpfs /books:rw,mode=1777 "$REF" > /dev/null 2>&1; then
  echo "FAIL start: docker run -d exited non-zero"
  exit 1
fi

CLIENT=$(cat <<'EXPORT_CLIENT_JS'
const BASE = 'http://127.0.0.1:8080';
const FORMATS = ['md', 'docx', 'epub', 'pdf'];
const CONTENT_TYPES = {
  md: 'text/markdown; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
};
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The fingerprint of every file under /books (D5): path, size, mtime and SHA-256. Only .scriba/index is skipped.
function snapshot(root) {
  const out = new Map();
  const walk = (rel) => {
    for (const name of fs.readdirSync(path.join(root, rel)).sort()) {
      const child = rel === '' ? name : `${rel}/${name}`;
      if (child === '.scriba/index' || child.startsWith('.scriba/index/')) continue;
      const full = path.join(root, child);
      const stats = fs.lstatSync(full);
      if (stats.isDirectory()) {
        walk(child);
      } else if (stats.isFile()) {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
        out.set(child, `${stats.size}:${stats.mtimeMs}:${hash}`);
      }
    }
  };
  walk('');
  return out;
}

function sameSnapshot(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

// The signature check of each format (D6).
function signatureProblem(format, bytes) {
  if (format === 'md') {
    if (bytes.length === 0) return 'the file is empty';
    if (bytes.includes(0)) return 'the file has a NUL byte';
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      return 'the file is not UTF-8';
    }
    return null;
  }
  if (format === 'docx') {
    if (bytes.subarray(0, 2).toString('latin1') !== 'PK') return 'the file does not start with PK';
    if (!bytes.includes('word/document.xml')) return 'the zip has no word/document.xml';
    return null;
  }
  if (format === 'epub') {
    if (bytes.subarray(0, 2).toString('latin1') !== 'PK') return 'the file does not start with PK';
    if (!bytes.includes('application/epub+zip')) return 'the zip has no application/epub+zip entry';
    return null;
  }
  return bytes.subarray(0, 5).toString('latin1') === '%PDF-' ? null : 'the file does not start with %PDF-';
}

async function waitForHealthz() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${BASE}/healthz`);
      if (response.status === 200) return true;
    } catch (error) {
      // The server is not listening yet.
    }
    await sleep(1000);
  }
  return false;
}

async function main() {
  if (!(await waitForHealthz())) {
    console.log('FAIL healthz: no 200 from /healthz after 60 polls');
    return 1;
  }

  // The setup link of this start (A3): open it once to get the session cookie.
  let cookie;
  try {
    const link = new URL(fs.readFileSync('/books/.scriba/setup-url', 'utf8').trim());
    const response = await fetch(`${BASE}${link.pathname}${link.search}`, { redirect: 'manual' });
    const setCookie = response.headers.get('set-cookie');
    if (response.status !== 303 || !setCookie) {
      console.log(`FAIL setup: the handshake gave ${response.status}, expected 303 with set-cookie`);
      return 1;
    }
    cookie = setCookie.split(';')[0];
  } catch (error) {
    console.log(`FAIL setup: ${error.message}`);
    return 1;
  }

  const headers = { cookie, 'content-type': 'application/json', origin: BASE };

  const started = await fetch(`${BASE}/api/project-store/projects/start-from-sample`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sampleId: 'nonfiction', folderName: 'export-smoke', title: 'Export Smoke' }),
  });
  if (started.status !== 201) {
    console.log(`FAIL start-from-sample: status ${started.status}, expected 201`);
    return 1;
  }
  const projectId = (await started.json()).id;

  const activated = await fetch(`${BASE}/api/project-store/active`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ projectId }),
  });
  if (activated.status !== 200) {
    console.log(`FAIL activate: status ${activated.status}, expected 200`);
    return 1;
  }

  let failed = false;
  for (const format of FORMATS) {
    const problem = await checkFormat(format, headers);
    if (problem !== null) {
      failed = true;
      console.log(`FAIL ${format}: ${problem}`);
    }
  }
  return failed ? 1 : 0;
}

// Returns null when the format passes, or the reason it fails. Prints the PASS line when it passes.
async function checkFormat(format, headers) {
  const root = '/books';
  const posted = await fetch(`${BASE}/api/compile-export/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ format }),
  });
  if (posted.status !== 200) return `POST export gave ${posted.status}, expected 200`;
  const result = await posted.json();
  if (typeof result.bytes !== 'number' || typeof result.fileName !== 'string') {
    return 'the export reply has no bytes and fileName';
  }
  if (!result.fileName.endsWith(`.${format}`)) return `the file name ${result.fileName} does not end with .${format}`;
  const afterPost = snapshot(root);

  const first = await fetch(`${BASE}/api/compile-export/exports/${format}`, { headers: { cookie: headers.cookie } });
  if (first.status !== 200) return `GET download gave ${first.status}, expected 200`;
  if (first.headers.get('content-type') !== CONTENT_TYPES[format]) {
    return `content-type is ${first.headers.get('content-type')}, expected ${CONTENT_TYPES[format]}`;
  }
  const bytes = Buffer.from(await first.arrayBuffer());
  if (first.headers.get('content-length') !== String(result.bytes)) {
    return `content-length is ${first.headers.get('content-length')}, expected ${result.bytes}`;
  }
  if (bytes.length !== result.bytes) return `the download has ${bytes.length} bytes, expected ${result.bytes}`;
  const problem = signatureProblem(format, bytes);
  if (problem !== null) return problem;
  const afterGet = snapshot(root);
  if (!sameSnapshot(afterPost, afterGet)) return 'the download GET changed the library';

  const second = await fetch(`${BASE}/api/compile-export/exports/${format}`, { headers: { cookie: headers.cookie } });
  if (second.status !== 200) return `second GET gave ${second.status}, expected 200`;
  if (!Buffer.from(await second.arrayBuffer()).equals(bytes)) return 'the second GET gave other bytes';

  console.log(`PASS ${format}: ${result.fileName} ${result.bytes} bytes`);
  return null;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.log(`FAIL client: ${error && error.message}`);
    process.exit(1);
  },
);
EXPORT_CLIENT_JS
)

OUTPUT=$(printf '%s\n' "$CLIENT" | docker exec -i "$NAME" node -)
client_status=$?
if [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

if [ "$client_status" -ne 0 ] || printf '%s\n' "$OUTPUT" | grep -q '^FAIL '; then
  docker logs --tail 40 "$NAME" >&2 2>&1
  exit 1
fi
exit 0
