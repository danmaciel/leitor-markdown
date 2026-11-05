#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_PATH="$PROJECT_DIR/build/bin/leitor-markdown"

if [ -f /run/.containerenv ]; then
  exec "$BIN_PATH" "$@"
else
  exec distrobox enter pdf-tradutor-dev -- "$BIN_PATH" "$@"
fi
