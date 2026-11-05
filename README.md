# Leitor Markdown

Leitor e editor de **Markdown** nativo para Linux, construído com **Go (Wails v2 + WebKit2GTK)** no backend e **React + TypeScript + Vite** no frontend.

## Funcionalidades

- **Tela Inicial de Seleção**: Ao abrir pelo menu de aplicativos (ou sem argumentos), exibe uma tela central para **Selecionar Arquivo (`.md`)**, **Abrir Pasta / Projeto**, acessar **Arquivos Recentes** ou abrir os exemplos interativos.
- **Integração com o KDE Plasma / Dolphin**: Menu de contexto no Dolphin (*botão direito → Abrir no Leitor Markdown*) e atalho no menu de aplicativos.
- **Live Reload em Tempo Real (`fsnotify`)**: Monitora alterações no arquivo aberto e na árvore de diretórios usando `inotify` do Linux. Salve em qualquer editor externo (Neovim, VS Code, Kate) e o preview atualiza instantaneamente.
- **GitHub Flavored Markdown (GFM)**: Tabelas, *task lists* (`- [x]`) clicáveis direto no preview, citações e autolinks.
- **Syntax Highlighting**: Blocos de código com destaque de sintaxe (`highlight.js` / `rehype-highlight`) e botão de copiar código.
- **Diagramas Mermaid**: Renderização nativa de blocos ```` ```mermaid ```` (fluxogramas, sequência, estados, classes) adaptada ao tema escuro/claro, com visualização do código-fonte.
- **Fórmulas Matemáticas ($\KaTeX$)**: Suporte a equações inline (`$...$`) e blocos matemáticos (`$$...$$`).
- **Árvore de Arquivos & Sumário (Outline)**: Sidebar com navegação por pastas, filtro de busca rápida, criação de novas notas `.md` e sumário navegável (`H1`–`H4`).
- **3 Modos de Visualização**: **Leitura** (padrão), **Split View** (edição lado a lado com *scroll sync* e barra de formatação) e **Editor**.

---

## 1. Instalação

Na pasta do projeto, rode:

```sh
cd ~/projetos/leitor-markdown
./install.sh
```

> Use `./install.sh --build` caso queira recompilar o binário antes de instalar.

Nada é instalado no sistema raiz: tudo fica na sua pasta pessoal (`~/.local`). O script cria três arquivos:

| Arquivo criado | O que faz |
| :--- | :--- |
| `~/.local/bin/leitor-markdown` | O comando para abrir o app pelo terminal |
| `~/.local/share/kio/servicemenus/leitor-markdown.desktop` | A opção **Abrir no Leitor Markdown** ao clicar com o botão direito no Dolphin |
| `~/.local/share/applications/leitor-markdown.desktop` | O atalho **Leitor Markdown** no menu de aplicativos do sistema |

Para desinstalar:

```sh
cd ~/projetos/leitor-markdown
./uninstall.sh
```

---

## 2. Formas de abrir o app

### Pelo Menu de Aplicativos
Procure por **Leitor Markdown** no menu do sistema. A janela abre na tela de seleção onde você pode escolher **Selecionar Arquivo (.md)**, **Abrir Pasta / Projeto** ou clicar em um dos seus **Arquivos Recentes**.

### Pelo Dolphin
Clique com o botão direito em qualquer arquivo `.md` (ou em uma pasta) e escolha **Abrir no Leitor Markdown** (ou *Abrir com → Leitor Markdown*).

### Pelo Terminal
```sh
# Abre a tela inicial para selecionar o arquivo pela interface
leitor-markdown

# Ou abre direto um arquivo ou pasta
leitor-markdown ~/projetos/README.md
```

---

## 3. Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + O` | Selecionar arquivo Markdown (`.md`) |
| `Ctrl + Shift + O` | Selecionar pasta / projeto |
| `Ctrl + \` | Alternar entre **Leitura**, **Split View** e **Editor** |
| `Ctrl + B` | Mostrar / Ocultar a Sidebar |
| `Ctrl + S` | Salvar alterações no disco |

---

## 4. Arquitetura e Estrutura do Projeto (Padrão Go)

O backend segue a convenção oficial da comunidade Go (*Standard Go Project Layout* / `internal/`), isolando responsabilidades em pacotes privados coesos e mantendo o `main.go` na raiz apenas para o *wiring* do `embed.FS` e inicialização do Wails:

```text
leitor-markdown/
├── main.go                       # Entrypoint da aplicação e embed do frontend/dist
├── go.mod / go.sum               # Definição do módulo Go e dependências
├── wails.json                    # Configuração do Wails v2
├── install.sh / uninstall.sh     # Instalador e desinstalador local (~/.local)
├── data/                         # Templates .desktop (Menu de Apps e Dolphin ServiceMenu)
├── scripts/                      # Scripts auxiliares (dev.sh e run.sh)
├── internal/                     # Pacotes privados da aplicação (encapsulados pelo compilador Go)
│   ├── app/                      # Camada de aplicação exposta ao Wails IPC (App controller e diálogos)
│   │   ├── app.go
│   │   └── app_test.go
│   ├── domain/                   # Entidades de domínio e regras puras (FileDocument, FileTreeNode)
│   │   └── models.go
│   ├── watcher/                  # Monitoramento de arquivos em tempo real via Linux inotify (fsnotify)
│   │   ├── watcher.go
│   │   └── watcher_test.go
│   └── workspace/                # Leitura/escrita no disco, varredura de árvores e exemplos
│       ├── service.go
│       ├── service_test.go
│       └── sample.go
└── frontend/                     # Aplicação React 19 + TypeScript + Vite
    └── src/
        ├── App.tsx               # Shell principal, atalhos e tela de seleção
        ├── wailsBridge.ts        # Ponte tipada para o backend Go (Wails IPC)
        ├── types.ts              # Contratos TypeScript espelhando internal/domain
        └── components/           # MarkdownPreview, MermaidBlock, MarkdownEditor, FileTreeSidebar
```

### Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Desktop / Core** | Go + [Wails v2](https://wails.io) (`WebKit2GTK 4.1` nativo no Linux) |
| **File Watcher** | `github.com/fsnotify/fsnotify` (`inotify`) |
| **Frontend** | React 19 + TypeScript + Vite |
| **Pipeline Markdown** | `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-highlight`, `rehype-slug` |
| **Diagramas & Math** | `mermaid` + `katex` |

### Comandos para Desenvolvedores

```sh
# Rodar em modo de desenvolvimento com Hot Reload
./scripts/dev.sh

# Recompilar o binário de produção e atualizar a instalação local
./install.sh --build

# Executar todos os testes automatizados dos pacotes em internal/
distrobox enter pdf-tradutor-dev -- sh -c 'export PATH="$HOME/.local/share/mise/installs/go/1.27.3/bin:$PATH" && go test -tags webkit2_41 -v ./...'
```
