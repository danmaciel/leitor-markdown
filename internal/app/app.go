package app

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"leitor-markdown/internal/domain"
	"leitor-markdown/internal/watcher"
	"leitor-markdown/internal/workspace"
)

// App coordinates the Wails desktop lifecycle, file operations, and live reload events.
type App struct {
	ctx           context.Context
	wailsReady    bool
	initialTarget string
	watcher       *watcher.Watcher
}

// New creates a new App instance with an optional initial CLI file or directory target.
func New(initialTarget string) *App {
	a := &App{
		initialTarget: initialTarget,
	}
	fw, err := watcher.New(a.handleFileChanged, a.handleTreeChanged)
	if err == nil {
		a.watcher = fw
	}
	return a
}

// Startup is invoked by Wails when the desktop window is initialized.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.wailsReady = true
}

// Shutdown is invoked by Wails when the application is closing.
func (a *App) Shutdown(ctx context.Context) {
	if a.watcher != nil {
		_ = a.watcher.Close()
	}
}

func (a *App) handleFileChanged(path string) {
	doc, err := workspace.ReadDocument(path)
	if err != nil {
		return
	}
	if a.wailsReady && a.ctx != nil {
		runtime.EventsEmit(a.ctx, "markdown:file-changed", doc)
	}
}

func (a *App) handleTreeChanged(rootDir string) {
	tree, _, err := workspace.BuildDirectoryTree(rootDir)
	if err != nil {
		return
	}
	if a.wailsReady && a.ctx != nil {
		runtime.EventsEmit(a.ctx, "markdown:tree-changed", tree)
	}
}

// GetStartupInfo returns the initial file/folder if passed via CLI/Dolphin, or an empty state so the user can pick a file in the UI.
func (a *App) GetStartupInfo() (*domain.StartupInfo, error) {
	target := strings.TrimSpace(a.initialTarget)
	if target != "" {
		target = strings.TrimPrefix(target, "file://")
		absTarget, err := filepath.Abs(target)
		if err == nil {
			if info, statErr := os.Stat(absTarget); statErr == nil {
				if info.IsDir() {
					tree, err := a.ListDirectory(absTarget)
					if err != nil {
						return nil, err
					}
					firstMd := workspace.FindFirstMarkdownFile(tree)
					var doc *domain.FileDocument
					if firstMd != "" {
						doc, _ = a.ReadMarkdownFile(firstMd)
					}
					return &domain.StartupInfo{
						InitialFile: doc,
						InitialTree: tree,
						RootDir:     absTarget,
					}, nil
				}
				doc, err := a.ReadMarkdownFile(absTarget)
				if err != nil {
					return nil, err
				}
				rootDir := filepath.Dir(absTarget)
				tree, _ := a.ListDirectory(rootDir)
				return &domain.StartupInfo{
					InitialFile: doc,
					InitialTree: tree,
					RootDir:     rootDir,
				}, nil
			}
		}
	}

	return &domain.StartupInfo{
		InitialFile: nil,
		InitialTree: nil,
		RootDir:     "",
	}, nil
}

// LoadSampleWorkspace creates and loads the built-in interactive Markdown examples on demand.
func (a *App) LoadSampleWorkspace() (*domain.StartupInfo, error) {
	dataDir, err := os.UserHomeDir()
	if err != nil {
		dataDir = "."
	} else {
		dataDir = filepath.Join(dataDir, ".local", "share", "leitor-markdown")
	}

	exDir, welcomePath := workspace.EnsureSampleWorkspace(dataDir)
	if exDir == "" || welcomePath == "" {
		return nil, errors.New("não foi possível preparar os arquivos de exemplo")
	}

	doc, err := a.ReadMarkdownFile(welcomePath)
	if err != nil {
		return nil, err
	}
	tree, _ := a.ListDirectory(exDir)
	return &domain.StartupInfo{
		InitialFile: doc,
		InitialTree: tree,
		RootDir:     exDir,
	}, nil
}

// ReadMarkdownFile reads a Markdown file from disk and starts watching it for live reload.
func (a *App) ReadMarkdownFile(path string) (*domain.FileDocument, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("caminho do arquivo vazio")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}

	doc, err := workspace.ReadDocument(absPath)
	if err != nil {
		return nil, err
	}

	if a.watcher != nil {
		_ = a.watcher.WatchFile(absPath)
	}
	return doc, nil
}

// SaveMarkdownFile writes the Markdown content to disk and suppresses self-triggered reload bounce.
func (a *App) SaveMarkdownFile(path string, content string) (*domain.FileDocument, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("caminho do arquivo vazio")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}

	if a.watcher != nil {
		a.watcher.MarkSelfSave(absPath)
	}

	doc, err := workspace.SaveDocument(absPath, content)
	if err != nil {
		return nil, err
	}

	if a.watcher != nil {
		_ = a.watcher.WatchFile(absPath)
	}
	return doc, nil
}

// CreateMarkdownFile creates a new .md file inside dirPath and opens it.
func (a *App) CreateMarkdownFile(dirPath string, fileName string) (*domain.FileDocument, error) {
	cleanName := strings.TrimSpace(fileName)
	if cleanName == "" {
		return nil, errors.New("informe um nome para o arquivo")
	}
	if !domain.IsMarkdownFile(cleanName) {
		cleanName += ".md"
	}

	absDir, err := filepath.Abs(dirPath)
	if err != nil {
		return nil, err
	}

	targetPath := filepath.Join(absDir, cleanName)
	if _, err := os.Stat(targetPath); err == nil {
		return nil, fmt.Errorf("o arquivo '%s' já existe", cleanName)
	}

	title := strings.TrimSuffix(cleanName, filepath.Ext(cleanName))
	initialContent := fmt.Sprintf("# %s\n\nComece a escrever seu Markdown aqui...\n", title)

	return a.SaveMarkdownFile(targetPath, initialContent)
}

// ListDirectory scans a directory recursively for Markdown files and watches it for changes.
func (a *App) ListDirectory(dirPath string) (*domain.FileTreeNode, error) {
	if strings.TrimSpace(dirPath) == "" {
		return nil, errors.New("caminho do diretório vazio")
	}
	absDir, err := filepath.Abs(dirPath)
	if err != nil {
		return nil, err
	}

	tree, dirs, err := workspace.BuildDirectoryTree(absDir)
	if err != nil {
		return nil, err
	}

	if a.watcher != nil {
		_ = a.watcher.WatchDirectoryTree(absDir, dirs)
	}
	return tree, nil
}

// SelectFileDialog opens a native GTK file dialog to pick a Markdown file.
func (a *App) SelectFileDialog() (*domain.FileDocument, error) {
	if !a.wailsReady || a.ctx == nil {
		return nil, errors.New("diálogo nativo indisponível fora do runtime Wails")
	}

	defaultDir, _ := os.UserHomeDir()
	selected, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Selecionar Arquivo Markdown",
		DefaultDirectory: defaultDir,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Arquivos Markdown (*.md, *.markdown, *.mdx, *.txt)",
				Pattern:     "*.md;*.markdown;*.mdx;*.txt",
			},
			{
				DisplayName: "Todos os Arquivos (*)",
				Pattern:     "*",
			},
		},
	})
	if err != nil {
		return nil, err
	}
	if selected == "" {
		return nil, nil
	}
	return a.ReadMarkdownFile(selected)
}

// SelectFolderDialog opens a native GTK folder dialog to pick a workspace folder.
func (a *App) SelectFolderDialog() (*domain.FileTreeNode, error) {
	if !a.wailsReady || a.ctx == nil {
		return nil, errors.New("diálogo nativo indisponível fora do runtime Wails")
	}

	defaultDir, _ := os.UserHomeDir()
	selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Selecionar Pasta de Arquivos Markdown",
		DefaultDirectory: defaultDir,
	})
	if err != nil {
		return nil, err
	}
	if selected == "" {
		return nil, nil
	}
	return a.ListDirectory(selected)
}
