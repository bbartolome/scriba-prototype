#!/bin/sh
set -eu
if [ "${SETUP:-}" = "true" ]; then
  # PLT-17 dispenser: print the first-install script for `docker run --rm -e SETUP=true ... | bash`.
  # Stdout carries only the script. A build with no usable tag exits 1 with a reason on stderr.
  BUILD_INFO_JS=/opt/scriba/app/apps/api/dist/modules/platform/build-info.js
  VERSION=$(node -p "require('$BUILD_INFO_JS').BUILD_INFO.version") || VERSION=""
  REVISION=$(node -p "require('$BUILD_INFO_JS').BUILD_INFO.revision") || REVISION=""
  if [ "$VERSION" != "0.0.0-dev" ] && printf '%s\n' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
    PIN=$VERSION
  elif printf '%s\n' "$REVISION" | grep -Eq '^[0-9a-f]{7,40}$'; then
    PIN=sha-$REVISION
  else
    echo "Cannot pick an image tag: this build has no release version and no git revision. Use a published image." >&2
    exit 1
  fi
  sed "s|@@PIN@@|$PIN|g" <<'INSTALLER'
#!/usr/bin/env bash
# Scriba first install (PLT-17). Run it with: docker run --rm -e SETUP=true bbartolome/scriba | bash
# Run it in the folder that will hold .env and the compose file, outside the library.
set -euo pipefail
export LC_ALL=C

REF=bbartolome/scriba:@@PIN@@
IMAGE_TAG=@@PIN@@
DEFAULT_PORT=8080
DEFAULT_LIBRARY="$HOME/Books"

say() {
  printf '%s\n' "$*"
}

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

# Returns 0 and sets CLEAN_LIBRARY when the answer is a usable absolute path.
clean_library() {
  local p=$1
  case "$p" in
    '~'|'~/'*) p="$HOME${p#\~}" ;;
  esac
  case "$p" in
    *\"*|*\$*|*\`*|*$'\n'*) return 1 ;;
    /*) ;;
    *) return 1 ;;
  esac
  while [ "$p" != / ] && [ "${p%/}" != "$p" ]; do
    p=${p%/}
  done
  [ "$p" != / ] || return 1
  CLEAN_LIBRARY=$p
}

valid_port() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "${#1}" -le 5 ] || return 1
  [ "$((10#$1))" -ge 1 ] && [ "$((10#$1))" -le 65535 ]
}

# S1. Checks before any write.
say "Checking your user, this folder, Docker and Docker Compose..."
HOST_UID=$(id -u </dev/null)
HOST_GID=$(id -g </dev/null)
[ "$HOST_UID" != 0 ] || fail "Run this as your own user, not as root. The container runs as your user ID."
if [ -e .env ] || [ -L .env ]; then
  fail "A .env already exists in $(pwd). This is not a first install, so nothing was changed. Updating an install is a separate path (PLT-18)."
fi
command -v docker >/dev/null || fail "Docker is not installed, or it is not on PATH. Install Docker, then run this again."
docker info >/dev/null </dev/null || fail "Docker is installed but cannot be reached. Start Docker, then run this again."
COMPOSE_TEXT=$(docker compose version --short </dev/null 2>/dev/null) || COMPOSE_TEXT=""
COMPOSE_BASE=${COMPOSE_TEXT%%-*}
COMPOSE_MAJOR=0
COMPOSE_MINOR=0
if [[ "$COMPOSE_BASE" =~ ^([0-9]+)\.([0-9]+) ]]; then
  COMPOSE_MAJOR=${BASH_REMATCH[1]}
  COMPOSE_MINOR=${BASH_REMATCH[2]}
fi
if [ "$COMPOSE_MAJOR" -lt 2 ] || { [ "$COMPOSE_MAJOR" -eq 2 ] && [ "$COMPOSE_MINOR" -lt 24 ]; }; then
  fail "Docker Compose 2.24 or later is required. Found: ${COMPOSE_TEXT:-nothing}. Install or update the Compose plugin, then run this again."
fi
if [ -n "${TS_AUTHKEY:-}" ]; then
  case "$TS_AUTHKEY" in
    *[!A-Za-z0-9_-]*) fail "TS_AUTHKEY may hold only letters, digits, _ and -. Nothing was written." ;;
  esac
fi
say "Docker and Docker Compose are ready."

# S2. The image: pull only when the pinned tag is not local. Pull progress goes to stderr.
say "Checking the Scriba image $REF..."
if ! docker image inspect "$REF" >/dev/null 2>&1 </dev/null; then
  say "Downloading the Scriba image (its progress goes to stderr)..."
  docker pull "$REF" </dev/null >&2 || fail "Could not pull $REF. Check the network, then run this again."
fi

# S3. Extract the installer files through a temporary folder, then move the four named files.
TMP=$(mktemp -d </dev/null)
trap 'rm -rf "$TMP"' EXIT
say "Extracting the installer files from the image..."
docker run --rm --entrypoint tar "$REF" -C /opt/installer -cf - . </dev/null | tar -xf - -C "$TMP" \
  || fail "Could not read the installer files from $REF."
for name in compose.yaml compose-version installer-hint.txt RUNBOOK.md; do
  [ -f "$TMP/$name" ] || fail "The image has no $name, so nothing was installed."
done
mv "$TMP/compose.yaml" "$TMP/compose-version" "$TMP/installer-hint.txt" "$TMP/RUNBOOK.md" . </dev/null
rm -rf "$TMP" </dev/null
[ -f compose.yaml ] && [ -f compose-version ] || fail "The compose files are missing after extraction, so nothing was started."

# S4. Answers: prompts only when a terminal can be opened; otherwise the defaults.
if ( exec </dev/tty ) 2>/dev/null; then
  INTERACTIVE=yes
else
  INTERACTIVE=no
fi
LIBRARY=$DEFAULT_LIBRARY
PORT=$DEFAULT_PORT
if [ "$INTERACTIVE" = yes ]; then
  while :; do
    printf 'Folder for your books [%s]: ' "$DEFAULT_LIBRARY" >&2
    IFS= read -r ANSWER </dev/tty || ANSWER=""
    [ -n "$ANSWER" ] || ANSWER=$DEFAULT_LIBRARY
    if clean_library "$ANSWER"; then
      LIBRARY=$CLEAN_LIBRARY
      break
    fi
    printf 'Enter an absolute path with no quotes, dollar signs or backticks.\n' >&2
  done
  while :; do
    printf 'Web port [%s]: ' "$DEFAULT_PORT" >&2
    IFS= read -r ANSWER </dev/tty || ANSWER=""
    [ -n "$ANSWER" ] || ANSWER=$DEFAULT_PORT
    if valid_port "$ANSWER"; then
      PORT=$((10#$ANSWER))
      break
    fi
    printf 'Enter a whole number from 1 to 65535.\n' >&2
  done
fi
INSTALL_DIR=$(pwd)
case "$INSTALL_DIR/" in
  "$LIBRARY/"*) fail "This folder ($INSTALL_DIR) is the library or inside it. Run the one-liner in a folder outside $LIBRARY. No library or .env was written." ;;
esac

# S5. The compose version stamped into .env: a positive whole number only.
COMPOSE_FILE_VERSION=$(cat compose-version </dev/null)
case "$COMPOSE_FILE_VERSION" in
  ''|*[!0-9]*) fail "compose-version must be a whole number, but it holds: $COMPOSE_FILE_VERSION" ;;
esac
[ "$COMPOSE_FILE_VERSION" -ge 1 ] || fail "compose-version must be 1 or higher."

# S6. The library and its .scriba folder, owned by this user.
say "Creating the library at $LIBRARY..."
mkdir -p "$LIBRARY" </dev/null
mkdir -p "$LIBRARY/.scriba" </dev/null
chmod 0700 "$LIBRARY/.scriba" </dev/null

# S7. .env: six keys, no secret.
say "Writing .env..."
{
  printf 'SCRIBA_LIBRARY="%s"\n' "$LIBRARY"
  printf 'SCRIBA_UID=%s\n' "$HOST_UID"
  printf 'SCRIBA_GID=%s\n' "$HOST_GID"
  printf 'SCRIBA_PORT=%s\n' "$PORT"
  printf 'SCRIBA_IMAGE_TAG=%s\n' "$IMAGE_TAG"
  printf 'SCRIBA_COMPOSE_VERSION=%s\n' "$COMPOSE_FILE_VERSION"
} > .env

# S8. .secret, only when TS_AUTHKEY is set: mode 0600, written under umask 077.
if [ -n "${TS_AUTHKEY:-}" ]; then
  ( umask 077; printf 'TS_AUTHKEY=%s\n' "$TS_AUTHKEY" > .secret )
  chmod 0600 .secret </dev/null
fi

# S9. Start the stack.
say "Starting Scriba with docker compose up -d..."
docker compose up -d </dev/null >&2 || fail "docker compose up -d failed. The messages above say why."

# S10. Wait for scriba to be healthy: 60 polls, 2 seconds apart. tailscale has no healthcheck.
say "Waiting for Scriba to become healthy..."
CONTAINER_ID=$(docker compose ps -q scriba </dev/null 2>/dev/null) || CONTAINER_ID=""
HEALTH=""
polls=0
while [ "$polls" -lt 60 ]; do
  HEALTH=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER_ID" </dev/null 2>/dev/null) || HEALTH=""
  if [ "$HEALTH" = healthy ] || [ "$HEALTH" = unhealthy ]; then
    break
  fi
  sleep 2 </dev/null
  polls=$((polls + 1))
done
if [ "$HEALTH" != healthy ]; then
  fail "Scriba did not become healthy (last state: ${HEALTH:-unknown}). To see why, run these in $INSTALL_DIR: docker compose logs scriba, and docker compose logs tailscale"
fi

# S11. The setup URL, then the Ollama note and the hint file.
SETUP_FILE=$LIBRARY/.scriba/setup-url
say "Scriba is healthy. Open this link to finish setup:"
if [ -f "$SETUP_FILE" ]; then
  IFS= read -r SETUP_URL <"$SETUP_FILE" || true
  say "$SETUP_URL"
else
  say "http://127.0.0.1:$PORT"
  say "The setup link is not written yet. Read it later with: cat $SETUP_FILE"
fi
say "For the local models, set OLLAMA_CONTEXT_LENGTH=64000 (or higher) where Ollama runs."
cat installer-hint.txt </dev/null
INSTALLER
  exit 0
fi
export SCRIBA_BOOKS_DIR="${SCRIBA_BOOKS_DIR:-/books}"
export SCRIBA_PACKS_DIR="${SCRIBA_PACKS_DIR:-/opt/scriba/packs}"
export SCRIBA_EXAMPLES_DIR="${SCRIBA_EXAMPLES_DIR:-/opt/scriba/examples}"
exec node /opt/scriba/app/apps/api/dist/main.js
