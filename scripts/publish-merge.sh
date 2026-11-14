#!/usr/bin/env bash
# PLT-19 merge step: checks the two digests and the merged manifest, then adds the tags in one
# imagetools call. Nothing is pushed before the manifest check passes.
# Usage (from the repository root): publish-merge.sh <digests-dir>
# Env: REGISTRY_IMAGE (for example docker.io/bbartolome/scriba), SHORT (the 7-character revision),
# RELEASE (true or false) and VERSION (required with RELEASE=true).
set -euo pipefail

REGISTRY_RE='^[a-z0-9._:/-]+$'
SHORT_RE='^[0-9a-f]{7,40}$'
SEMVER_RE='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'
DIGEST_RE='^[0-9a-f]{64}$'

if [ "$#" -ne 1 ]; then
  echo "usage: publish-merge.sh <digests-dir>" >&2
  exit 2
fi
dir=$1
registry=${REGISTRY_IMAGE:-}
short=${SHORT:-}
release=${RELEASE:-}
version=${VERSION:-}

if [[ ! $registry =~ $REGISTRY_RE ]]; then
  echo "publish-merge: REGISTRY_IMAGE must be a lowercase image name, got '$registry'" >&2
  exit 1
fi
if [[ ! $short =~ $SHORT_RE ]]; then
  echo "publish-merge: SHORT must be 7 to 40 lowercase hex characters, got '$short'" >&2
  exit 1
fi
if [ "$release" != true ] && [ "$release" != false ]; then
  echo "publish-merge: RELEASE must be true or false, got '$release'" >&2
  exit 1
fi
if [ "$release" = true ] && [[ ! $version =~ $SEMVER_RE ]]; then
  echo "publish-merge: VERSION must be a version such as 1.2.3 (no v prefix, no +build part), got '$version'" >&2
  exit 1
fi
if [ ! -d "$dir" ]; then
  echo "publish-merge: $dir is not a folder" >&2
  exit 1
fi

# One digest per platform: each entry is named by its digest, and there must be exactly two.
refs=()
names=$(ls -A "$dir")
while IFS= read -r name; do
  [ -n "$name" ] || continue
  if [[ ! $name =~ $DIGEST_RE ]]; then
    echo "publish-merge: $dir holds '$name', which is not a 64-character lowercase hex digest" >&2
    exit 1
  fi
  refs+=("$registry@sha256:$name")
done <<< "$names"
if [ "${#refs[@]}" -ne 2 ]; then
  echo "publish-merge: expected two digests in $dir, found ${#refs[@]}" >&2
  exit 1
fi

# The manifest check runs on a dry run, so a failed check leaves no tag behind.
manifest=$(docker buildx imagetools create --dry-run "${refs[@]}") || {
  echo "publish-merge: the dry-run manifest merge failed; nothing was pushed" >&2
  exit 1
}
platforms=$(printf '%s' "$manifest" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d));
  process.stdin.on("end", () => {
    const m = JSON.parse(s);
    const found = (m.manifests || [])
      .map((x) => x.platform)
      .filter((p) => p && p.os !== "unknown")
      .map((p) => p.os + "/" + p.architecture)
      .sort();
    console.log(found.join(" "));
  });
') || {
  echo "publish-merge: the dry-run manifest could not be read; nothing was pushed" >&2
  exit 1
}
if [ "$platforms" != "linux/amd64 linux/arm64" ]; then
  echo "publish-merge: the merged manifest must list linux/amd64 and linux/arm64 once each, found: $platforms" >&2
  exit 1
fi

tags=(-t "$registry:latest" -t "$registry:sha-$short")
if [ "$release" = true ]; then
  tags+=(-t "$registry:$version")
fi
docker buildx imagetools create "${tags[@]}" "${refs[@]}"
docker buildx imagetools inspect "$registry:sha-$short" \
  || echo "publish-merge: warning: could not inspect $registry:sha-$short" >&2
