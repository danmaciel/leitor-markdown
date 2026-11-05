#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_MISE_BIN="$HOME/.local/share/mise/installs/go/1.27.3/bin"
NODE_MISE_BIN="$HOME/.local/share/mise/installs/node/24.22.2/bin"

if [ -f /run/.containerenv ]; then
  export PATH="$GO_MISE_BIN:$NODE_MISE_BIN:$PATH"
  cd "$PROJECT_DIR"
  exec wails dev -tags webkit2_41
else
  exec distrobox enter pdf-tradutor-dev -- sh -c "export PATH=\"$GO_MISE_BIN:$NODE_MISE_BIN:\$PATH\" && cd \"$PROJECT_DIR\" && exec wails dev -tags webkit2_41"
fi
