#!/usr/bin/env bash
# PLT-19 image smoke checks, run once per architecture by the smoke job.
# Usage: smoke-image.sh <image-ref>
# Env: EXPECTED_VERSION and EXPECTED_PIN (required); EXPECTED_ARCH (optional, Node's process.arch);
# SMOKE_POLLS (default 60) and SMOKE_POLL_SLEEP (default 1) for the healthz wait;
# GITHUB_STEP_SUMMARY (optional, gets a table of the results).
# Every check runs even after a failure. Exit 0 when all pass, 1 when one fails, 2 on bad usage.
set -uo pipefail

if [ "$#" -ne 1 ] || [ -z "${EXPECTED_VERSION:-}" ] || [ -z "${EXPECTED_PIN:-}" ]; then
  echo "usage: smoke-image.sh <image-ref>, with EXPECTED_VERSION and EXPECTED_PIN set" >&2
  exit 2
fi
REF=$1
SMOKE_POLLS=${SMOKE_POLLS:-60}
SMOKE_POLL_SLEEP=${SMOKE_POLL_SLEEP:-1}
TMP=$(mktemp -d)
NAME="scriba-smoke-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1; rm -rf "$TMP"' EXIT
failures=0
: > "$TMP/summary"

CONVERT_SCRIPT='set -e
printf "# Title\n\nHello world.\n" > t.md
pandoc t.md -o t.docx
pandoc t.md -o t.epub
pandoc t.md --to=typst --pdf-engine=typst -o t.pdf
[ "$(head -c 2 t.docx)" = PK ] && grep -aq word/document.xml t.docx
[ "$(head -c 2 t.epub)" = PK ] && grep -aq application/epub+zip t.epub
[ "$(head -c 5 t.pdf)" = "%PDF-" ]
echo converted'

FTS5_SCRIPT="const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec('CREATE VIRTUAL TABLE t USING fts5(body)');db.exec(\"INSERT INTO t(body) VALUES ('the quick brown fox')\");console.log(JSON.stringify(db.prepare(\"SELECT body FROM t WHERE t MATCH 'quick'\").all()))"

# Each check prints its detail on success or its reason on failure, and returns 0 or 1.
check_dispenser() {
  docker run --rm -e SETUP=true "$REF" > "$TMP/boot.sh" 2>/dev/null \
    || { echo "docker run with SETUP=true exited non-zero"; return 1; }
  local first
  first=$(head -n 1 "$TMP/boot.sh")
  [ "$first" = '#!/usr/bin/env bash' ] || { echo "the first line is '$first', not #!/usr/bin/env bash"; return 1; }
  bash -n "$TMP/boot.sh" 2>/dev/null || { echo "bash -n fails on the dispenser script"; return 1; }
  grep -Fxq "REF=bbartolome/scriba:$EXPECTED_PIN" "$TMP/boot.sh" \
    || { echo "no line REF=bbartolome/scriba:$EXPECTED_PIN"; return 1; }
  grep -Fxq "IMAGE_TAG=$EXPECTED_PIN" "$TMP/boot.sh" \
    || { echo "no line IMAGE_TAG=$EXPECTED_PIN"; return 1; }
  echo "REF and IMAGE_TAG are $EXPECTED_PIN, and the script passes bash -n"
}

check_pandoc() {
  local out first
  out=$(docker run --rm --entrypoint pandoc "$REF" --version 2>/dev/null) \
    || { echo "pandoc --version exited non-zero"; return 1; }
  first=${out%%$'\n'*}
  [ "$first" = 'pandoc 3.13' ] || { echo "the first line is '$first', expected 'pandoc 3.13'"; return 1; }
  echo "$first"
}

check_typst() {
  local out first re='^typst [0-9]+\.[0-9]+\.[0-9]+'
  out=$(docker run --rm --entrypoint typst "$REF" --version 2>/dev/null) \
    || { echo "typst --version exited non-zero"; return 1; }
  first=${out%%$'\n'*}
  [[ $first =~ $re ]] || { echo "the first line is '$first', not typst <version>"; return 1; }
  echo "$first"
}

check_convert() {
  local out
  out=$(docker run --rm -w /tmp --entrypoint sh "$REF" -c "$CONVERT_SCRIPT" 2>/dev/null) \
    || { echo "the conversion exited non-zero"; return 1; }
  [ "$out" = converted ] || { echo "expected 'converted', got '${out:0:80}'"; return 1; }
  echo "Markdown converted to DOCX, EPUB and PDF (Typst)"
}

check_healthz() {
  local i=0 polled=1 body want
  docker run -d --name "$NAME" --tmpfs /books:rw,mode=1777 "$REF" > /dev/null 2>&1 \
    || { echo "docker run -d exited non-zero"; return 1; }
  while [ "$i" -lt "$SMOKE_POLLS" ]; do
    if docker exec "$NAME" node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      polled=0
      break
    fi
    i=$((i + 1))
    sleep "$SMOKE_POLL_SLEEP"
  done
  if [ "$polled" -ne 0 ]; then
    docker logs --tail 20 "$NAME" >&2 2>&1
    echo "no 200 from /healthz after $SMOKE_POLLS polls"
    return 1
  fi
  body=$(docker exec "$NAME" node -e "fetch('http://127.0.0.1:8080/healthz').then(async r=>console.log(r.status+' '+await r.text()))" 2>/dev/null) \
    || { echo "docker exec for /healthz exited non-zero"; return 1; }
  want="200 {\"status\":\"ok\",\"version\":\"$EXPECTED_VERSION\"}"
  [ "$body" = "$want" ] || { echo "got '$body', expected '$want'"; return 1; }
  echo "$body"
}

check_fts5() {
  local out
  out=$(docker run --rm --entrypoint node "$REF" -e "$FTS5_SCRIPT" 2>/dev/null) \
    || { echo "node exited non-zero"; return 1; }
  [ "$out" = '[{"body":"the quick brown fox"}]' ] || { echo "got '${out:0:80}'"; return 1; }
  echo "FTS5 MATCH through node:sqlite returns one row"
}

check_size() {
  local raw kib mib comp
  raw=$(docker run --rm --user 0 --entrypoint sh "$REF" -c 'du -sxk / | tail -n 1' 2>/dev/null) \
    || { echo "du could not run in the image"; return 1; }
  kib=${raw%%[[:space:]]*}
  case $kib in
    ''|*[!0-9]*) echo "du printed '${raw:0:60}', not a size"; return 1 ;;
  esac
  mib=$((kib / 1024))
  comp=$(docker buildx imagetools inspect --raw "$REF" 2>/dev/null | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        const m = JSON.parse(s);
        const total = (m.layers || []).reduce((a, l) => a + l.size, 0);
        if (total > 0) console.log((total / 1000000).toFixed(1) + " MB");
      } catch (e) {}
    });
  ' 2>/dev/null) || comp=""
  [ -n "$comp" ] || comp=n/a
  echo "unpacked $kib KiB ($mib MiB), compressed $comp"
}

check_arch() {
  local out
  out=$(docker run --rm --entrypoint node "$REF" -p process.arch 2>/dev/null) \
    || { echo "node exited non-zero"; return 1; }
  [ "$out" = "$EXPECTED_ARCH" ] || { echo "process.arch is '$out', expected '$EXPECTED_ARCH'"; return 1; }
  echo "process.arch is $out"
}

run_check() {
  local name=$1 out result
  if out=$("check_$name" 2>/dev/null); then
    result=PASS
  else
    result=FAIL
    failures=$((failures + 1))
  fi
  printf '%s %s: %s\n' "$result" "$name" "$out"
  printf '| %s | %s | %s |\n' "$name" "$result" "$out" >> "$TMP/summary"
}

run_check dispenser
run_check pandoc
run_check typst
run_check convert
run_check healthz
run_check fts5
run_check size
if [ -n "${EXPECTED_ARCH:-}" ]; then
  run_check arch
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "| check | result | detail |"
    echo "|---|---|---|"
    cat "$TMP/summary"
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$failures" -ne 0 ]; then
  exit 1
fi
exit 0
