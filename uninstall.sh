#!/usr/bin/env bash
# Remove o que o install.sh criou.
set -euo pipefail

rm -f "$HOME/.local/bin/leitor-markdown" \
      "$HOME/.local/share/kio/servicemenus/leitor-markdown.desktop" \
      "$HOME/.local/share/applications/leitor-markdown.desktop"

command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 >/dev/null 2>&1 || true
command -v update-desktop-database >/dev/null && update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true

echo "Leitor Markdown removido."
