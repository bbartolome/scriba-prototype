#!/usr/bin/env bash
# Local multi-arch build of the Scriba image (linux/amd64 and linux/arm64), run from the repo root.
set -euo pipefail

VERSION="${VERSION:-0.0.0-dev}"
REVISION="${REVISION:-$(git rev-parse --short HEAD)}"
BUILT_AT="${BUILT_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

SEMVER_RE='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$'
REVISION_RE='^[0-9a-f]{7,40}$'
BUILT_AT_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'

if [[ ! $VERSION =~ $SEMVER_RE ]]; then
  echo "build-image: VERSION must be a semver version, got '$VERSION'" >&2
  exit 1
fi
if [[ ! $REVISION =~ $REVISION_RE ]]; then
  echo "build-image: REVISION must be 7 to 40 lowercase hex characters, got '$REVISION'" >&2
  exit 1
fi
if [[ ! $BUILT_AT =~ $BUILT_AT_RE ]]; then
  echo "build-image: BUILT_AT must be UTC as YYYY-MM-DDTHH:MM:SSZ, got '$BUILT_AT'" >&2
  exit 1
fi

echo "build-image: VERSION=$VERSION REVISION=$REVISION BUILT_AT=$BUILT_AT"

for arch in amd64 arm64; do
  docker buildx build \
    --platform "linux/$arch" \
    --build-arg VERSION="$VERSION" \
    --build-arg REVISION="$REVISION" \
    --build-arg BUILT_AT="$BUILT_AT" \
    --load \
    -t "bbartolome/scriba:local-$arch" .
done
