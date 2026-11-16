#!/usr/bin/env bash
# GNP-05 image check: the built image holds /opt/scriba/packs/{core,nonfiction,fiction},
# core/tools/propose_graph.yaml is there, and the app user (UID 1000) cannot write to any of it.
# Local test, run once per image (CI has no Docker step). Not part of scripts/smoke-image.sh (PLT-19).
# Usage: packs-image-check.sh <image-ref>
# Every probe runs even after a failure. Exit 0 when all pass, 1 when one fails, 2 on bad usage.
set -uo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: packs-image-check.sh <image-ref>" >&2
  exit 2
fi
REF=$1
PACKS=/opt/scriba/packs
failures=0

pass() {
  echo "PASS $1: $2"
}

fail() {
  echo "FAIL $1: $2"
  failures=$((failures + 1))
}

# Runs a shell command inside the image; sets $out (stdout and stderr) and $rc.
in_image() {
  out=$(docker run --rm --entrypoint sh "$REF" -c "$1" 2>&1)
  rc=$?
}

# Probe 1: the image's configured user is 1000:1000.
user=$(docker image inspect --format '{{.Config.User}}' "$REF" 2>&1)
if [ "$user" = "1000:1000" ]; then
  pass user "$user"
else
  fail user "the configured user is '$user', expected '1000:1000'"
fi

# Probe 2: the process runs as UID 1000.
in_image 'id -u'
if [ "$rc" -eq 0 ] && [ "$out" = "1000" ]; then
  pass uid "$out"
else
  fail uid "id -u printed '$out' (exit $rc), expected '1000'"
fi

# Probes 3 and 4: the pack folders are present, and so is the propose_graph spec.
for pack in core nonfiction fiction; do
  in_image "test -d $PACKS/$pack"
  if [ "$rc" -eq 0 ]; then
    pass "present-$pack" "$PACKS/$pack is a folder"
  else
    fail "present-$pack" "$PACKS/$pack is missing (exit $rc) $out"
  fi
done

in_image "test -f $PACKS/core/tools/propose_graph.yaml"
if [ "$rc" -eq 0 ]; then
  pass present-propose_graph "$PACKS/core/tools/propose_graph.yaml exists"
else
  fail present-propose_graph "$PACKS/core/tools/propose_graph.yaml is missing (exit $rc) $out"
fi

# A probe that must be denied: the command fails and its stderr says Permission denied.
denied() {
  local name=$1 cmd=$2
  in_image "$cmd"
  if [ "$rc" -ne 0 ] && grep -q 'Permission denied' <<<"$out"; then
    pass "$name" "write refused: Permission denied"
  elif [ "$rc" -eq 0 ]; then
    fail "$name" "the write succeeded, expected Permission denied"
  else
    fail "$name" "exit $rc, expected Permission denied: $out"
  fi
}

# Probe 5: a new file cannot be created in each pack folder.
for pack in core nonfiction fiction; do
  denied "denied-$pack" "touch $PACKS/$pack/gnp05-probe"
done

# Probe 6: a new file cannot be created in the tools folder of core.
denied denied-core-tools "touch $PACKS/core/tools/gnp05-probe"

# Probe 7: propose_graph.yaml cannot be appended to.
denied denied-propose_graph "echo x >> $PACKS/core/tools/propose_graph.yaml"

if [ "$failures" -gt 0 ]; then
  echo "packs-image-check: $failures probe(s) failed" >&2
  exit 1
fi
echo "packs-image-check: all probes passed"
exit 0
