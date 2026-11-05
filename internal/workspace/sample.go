package workspace

import (
	"os"
	"path/filepath"
)

const DefaultWelcomeMarkdown = `# Bem-vindo ao Leitor Markdown

Um leitor e editor de **Markdown** nativo para Linux construído com **Go (Wails v2 + WebKitGTK)** e **React + TypeScript**.

---

## Principais Recursos Ativos

- [x] **Live Reload em Tempo Real (` + "`fsnotify`" + `)**: Edite este arquivo no Neovim, VS Code ou no modo **Split View** e veja a atualização instantânea.
- [x] **GitHub Flavored Markdown (GFM)**: Tabelas, *task lists* interativas, código e citações.
- [x] **Syntax Highlighting**: Blocos de código com destaque de sintaxe e botão de cópia rápida.
- [x] **Diagramas Mermaid**: Fluxogramas, diagramas de sequência e arquitetura renderizados nativamente.
- [x] **Matemática com KaTeX**: Equações inline como $E = mc^2$ e blocos matemáticos completos.
- [x] **Split View Sincronizado**: Alterne entre **Leitura**, **Dividido** (` + "`Ctrl+\\`" + `) e **Editor**.

---

## 1. Arquitetura do Aplicativo (Mermaid)

` + "```mermaid" + `
flowchart LR
    Disk[("Sistema de Arquivos\n(Linux inotify)")]
    Go["Backend em Go\n(Wails v2 + fsnotify)"]
    UI["Frontend React + TS\n(Unified / Remark / Rehype)"]
    Preview["Renderizador Rico\n(GFM + Shiki + Mermaid + KaTeX)"]

    Disk -->|"Evento de escrita"| Go
    Go -->|"Evento Wails IPC"| UI
    UI --> Preview
    UI -->|"Salvar (Ctrl+S)"| Go
    Go -->|"Gravação atômica"| Disk
` + "```" + `

---

## 2. Fórmulas Matemáticas ($\KaTeX$)

Fórmulas inline funcionam perfeitamente no meio do texto, como a identidade de Euler $e^{i\pi} + 1 = 0$ ou a complexidade $\mathcal{O}(n \log n)$.

Também suportamos blocos de equações completos:

$$
\mathcal{L}(\theta) = -\frac{1}{N} \sum_{i=1}^{N} \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right] + \lambda \|\theta\|_2^2
$$

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi} \qquad \text{e} \qquad \nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$

---

## 3. Blocos de Código com Syntax Highlighting

` + "```go" + `
package main

import (
	"fmt"
	"time"
)

// Monitora alterações no arquivo Markdown com baixa latência
func WatchDocument(path string, updates <-chan string) {
	for content := range updates {
		fmt.Printf("[%s] Arquivo %s atualizado (%d bytes)\n",
			time.Now().Format(time.RFC3339), path, len(content))
	}
}
` + "```" + `

` + "```typescript" + `
interface MarkdownStats {
  words: number;
  lines: number;
  readingTimeMinutes: number;
}

export function calculateStats(markdown: string): MarkdownStats {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const lines = markdown.split('\n').length;
  return {
    words,
    lines,
    readingTimeMinutes: Math.max(1, Math.ceil(words / 200)),
  };
}
` + "```" + `

---

## 4. Tabelas GFM & Atalhos

| Atalho | Ação | Modo |
| :--- | :--- | :---: |
| ` + "`Ctrl + O`" + ` | Abrir arquivo Markdown (` + "`.md`" + `) | Todos |
| ` + "`Ctrl + Shift + O`" + ` | Abrir pasta / projeto na Sidebar | Todos |
| ` + "`Ctrl + \\`" + ` | Alternar modo **Leitura / Split / Editor** | Todos |
| ` + "`Ctrl + B`" + ` | Mostrar / Ocultar Sidebar de arquivos | Todos |
| ` + "`Ctrl + S`" + ` | Salvar alterações no disco | Split / Editor |

> **Dica:** Você pode clicar diretamente nos *checkboxes* da lista de tarefas no topo deste documento para marcar ou desmarcar itens!
`

const SampleDiagramsMarkdown = `# Diagramas & Matemática Avançada

Este documento demonstra diagramas **Mermaid** e expressões **KaTeX** renderizadas em tempo real.

## Diagrama de Sequência

` + "```mermaid" + `
sequenceDiagram
    autonumber
    actor User as Usuário
    participant Editor as Editor / Split View
    participant Go as Backend Go (Wails)
    participant FS as Linux FS (inotify)

    User->>Editor: Edita Markdown ou salva no Vim
    FS-->>Go: Notificação fsnotify (Write/Create)
    Go-->>Editor: Evento "markdown:file-changed"
    Editor->>Editor: Re-renderiza AST (Remark + Rehype)
    Editor-->>User: Preview atualizado sem perder o scroll!
` + "```" + `

## Máquina de Estados

` + "```mermaid" + `
stateDiagram-v2
    [*] --> Leitura
    Leitura --> SplitView : Ctrl+\
    SplitView --> Editor : Ctrl+\
    Editor --> Leitura : Ctrl+\
    SplitView --> Salvando : Ctrl+S
    Salvando --> SplitView : Confirmado no disco
` + "```" + `

## Álgebra Linear & Cálculo

Matriz de transformação e autovalores:

$$
A = \begin{pmatrix}
\cos\theta & -\sin\theta & 0 \\
\sin\theta & \cos\theta & 0 \\
0 & 0 & 1
\end{pmatrix}, \qquad \det(A - \lambda I) = 0
$$
`

// EnsureSampleWorkspace creates the built-in interactive Markdown examples inside baseDir/exemplos.
func EnsureSampleWorkspace(baseDir string) (string, string) {
	exDir := filepath.Join(baseDir, "exemplos")
	if err := os.MkdirAll(exDir, 0o755); err != nil {
		return "", ""
	}

	welcomePath := filepath.Join(exDir, "01-boas-vindas.md")
	if _, err := os.Stat(welcomePath); os.IsNotExist(err) {
		_ = os.WriteFile(welcomePath, []byte(DefaultWelcomeMarkdown), 0o644)
	}

	diagramsPath := filepath.Join(exDir, "02-diagramas-e-matematica.md")
	if _, err := os.Stat(diagramsPath); os.IsNotExist(err) {
		_ = os.WriteFile(diagramsPath, []byte(SampleDiagramsMarkdown), 0o644)
	}

	return exDir, welcomePath
}
