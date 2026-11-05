#!/usr/bin/env bash
# Instala o Leitor Markdown para o usuário atual (tudo em ~/.local; nada no sistema).
set -euo pipefail

PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$PROJ/build/bin/leitor-markdown"
BIN_DIR="$HOME/.local/bin"
SERVICEMENU_DIR="$HOME/.local/share/kio/servicemenus"
APPS_DIR="$HOME/.local/share/applications"
WRAPPER="$BIN_DIR/leitor-markdown"
CONTAINER_NAME="pdf-tradutor-dev"

# Se o binário ainda não foi compilado (ou se passou --build), compila agora
if [ ! -x "$BIN" ] || [ "${1:-}" = "--build" ]; then
    echo "Compilando o Leitor Markdown..."
    GO_MISE_BIN="$HOME/.local/share/mise/installs/go/1.27.3/bin"
    NODE_MISE_BIN="$HOME/.local/share/mise/installs/node/24.22.2/bin"
    (
        cd "$PROJ/frontend"
        PATH="$NODE_MISE_BIN:$PATH" npm run build
    )
    distrobox enter "$CONTAINER_NAME" -- sh -c \
        "export PATH=\"$GO_MISE_BIN:$NODE_MISE_BIN:\$PATH\" && cd \"$PROJ\" && wails build -tags webkit2_41 -s"
fi

if [ ! -x "$BIN" ]; then
    echo "Erro: binário não encontrado em $BIN" >&2
    exit 1
fi

mkdir -p "$BIN_DIR" "$SERVICEMENU_DIR" "$APPS_DIR"

cat > "$WRAPPER" <<WRAP
#!/usr/bin/env bash
BIN="$BIN"
if [ -f /run/.containerenv ] || ! ldd "\$BIN" 2>/dev/null | grep -q "not found"; then
    exec "\$BIN" "\$@"
else
    exec /usr/bin/distrobox-enter -n "$CONTAINER_NAME" -- "\$BIN" "\$@"
fi
WRAP
chmod +x "$WRAPPER"

sed "s|@EXEC@|$WRAPPER|" "$PROJ/data/servicemenu.desktop" > "$SERVICEMENU_DIR/leitor-markdown.desktop"
chmod +x "$SERVICEMENU_DIR/leitor-markdown.desktop"   # o Plasma 6 exige service menus executáveis
sed "s|@EXEC@|$WRAPPER|" "$PROJ/data/app.desktop" > "$APPS_DIR/leitor-markdown.desktop"

command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 >/dev/null 2>&1 || true
command -v update-desktop-database >/dev/null && update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true

echo "Instalado:"
echo "  $WRAPPER"
echo "  $SERVICEMENU_DIR/leitor-markdown.desktop  (Dolphin: botão direito → Abrir no Leitor Markdown)"
echo "  $APPS_DIR/leitor-markdown.desktop  (menu de aplicativos)"
