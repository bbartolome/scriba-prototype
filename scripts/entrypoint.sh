#!/bin/sh
set -eu
if [ "${SETUP:-}" = "true" ]; then
  cat <<'EOF'
#!/usr/bin/env bash
# PLT-14 stub: a no-op. PLT-17 replaces this script.
exit 0
EOF
  exit 0
fi
export SCRIBA_BOOKS_DIR="${SCRIBA_BOOKS_DIR:-/books}"
export SCRIBA_PACKS_DIR="${SCRIBA_PACKS_DIR:-/opt/scriba/packs}"
export SCRIBA_EXAMPLES_DIR="${SCRIBA_EXAMPLES_DIR:-/opt/scriba/examples}"
exec node /opt/scriba/app/apps/api/dist/main.js
