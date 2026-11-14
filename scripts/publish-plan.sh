#!/usr/bin/env bash
# PLT-19 plan step: reads the version that release-guard.mjs wrote (if a release is due) and
# prints the plan values as key=value lines for $GITHUB_OUTPUT.
# Usage: publish-plan.sh <next-version-file>. Needs GITHUB_SHA; BUILT_AT is optional.
set -euo pipefail

SEMVER_RE='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'
REVISION_RE='^[0-9a-f]{7,40}$'
BUILT_AT_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'

if [ "$#" -ne 1 ]; then
  echo "usage: publish-plan.sh <next-version-file>" >&2
  exit 2
fi

sha=${GITHUB_SHA:-}
if [[ ! $sha =~ $REVISION_RE ]]; then
  echo "publish-plan: GITHUB_SHA must be 7 to 40 lowercase hex characters, got '$sha'" >&2
  exit 1
fi
built_at=${BUILT_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}
if [[ ! $built_at =~ $BUILT_AT_RE ]]; then
  echo "publish-plan: BUILT_AT must be UTC as YYYY-MM-DDTHH:MM:SSZ, got '$built_at'" >&2
  exit 1
fi
short=${sha:0:7}

file=$1
if [ ! -e "$file" ]; then
  release=false
  version=0.0.0-dev
  pin="sha-$short"
else
  lines=0
  version=
  while IFS= read -r line || [ -n "$line" ]; do
    lines=$((lines + 1))
    version=$line
  done < "$file"
  if [ "$lines" -ne 1 ] || [[ ! $version =~ $SEMVER_RE ]]; then
    echo "publish-plan: $file must hold one line with a version such as 1.2.3 (no v prefix, no +build part)" >&2
    exit 1
  fi
  release=true
  pin=$version
fi

printf 'release=%s\nversion=%s\npin=%s\nshort=%s\nbuilt_at=%s\n' "$release" "$version" "$pin" "$short" "$built_at"
