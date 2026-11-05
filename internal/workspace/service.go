package workspace

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"leitor-markdown/internal/domain"
)

// ReadDocument reads a Markdown file from the given absolute path and returns its metadata and content.
func ReadDocument(absPath string) (*domain.FileDocument, error) {
	info, err := os.Stat(absPath)
	if err != nil {
		return nil, fmt.Errorf("não foi possível acessar o arquivo: %w", err)
	}
	if info.IsDir() {
		return nil, errors.New("o caminho informado é um diretório, não um arquivo")
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler arquivo: %w", err)
	}

	return &domain.FileDocument{
		Path:      absPath,
		Name:      filepath.Base(absPath),
		Content:   string(data),
		UpdatedAt: info.ModTime().Format("15:04:05"),
		Size:      info.Size(),
	}, nil
}

// SaveDocument writes content to absPath and returns the updated FileDocument.
func SaveDocument(absPath string, content string) (*domain.FileDocument, error) {
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return nil, fmt.Errorf("erro ao criar diretório pai: %w", err)
	}

	if err := os.WriteFile(absPath, []byte(content), 0o644); err != nil {
		return nil, fmt.Errorf("erro ao salvar arquivo: %w", err)
	}

	return ReadDocument(absPath)
}

// BuildDirectoryTree scans rootPath recursively for Markdown files and returns the tree and list of watched subdirectories.
func BuildDirectoryTree(rootPath string) (*domain.FileTreeNode, []string, error) {
	info, err := os.Stat(rootPath)
	if err != nil {
		return nil, nil, err
	}
	if !info.IsDir() {
		return nil, nil, errors.New("o caminho informado não é um diretório")
	}

	var watchedDirs []string
	var scan func(currentPath string, depth int) (*domain.FileTreeNode, bool)

	scan = func(currentPath string, depth int) (*domain.FileTreeNode, bool) {
		node := &domain.FileTreeNode{
			Name:  filepath.Base(currentPath),
			Path:  currentPath,
			IsDir: true,
		}
		if depth > 6 {
			return node, false
		}

		entries, err := os.ReadDir(currentPath)
		if err != nil {
			return node, false
		}

		hasMd := false
		for _, entry := range entries {
			name := entry.Name()
			fullPath := filepath.Join(currentPath, name)

			if entry.IsDir() {
				if domain.ShouldIgnoreDir(name) {
					continue
				}
				childNode, childHasMd := scan(fullPath, depth+1)
				if childHasMd {
					node.Children = append(node.Children, childNode)
					watchedDirs = append(watchedDirs, fullPath)
					hasMd = true
				}
			} else if domain.IsMarkdownFile(name) {
				node.Children = append(node.Children, &domain.FileTreeNode{
					Name:  name,
					Path:  fullPath,
					IsDir: false,
				})
				hasMd = true
			}
		}

		sort.Slice(node.Children, func(i, j int) bool {
			if node.Children[i].IsDir != node.Children[j].IsDir {
				return node.Children[i].IsDir
			}
			return strings.ToLower(node.Children[i].Name) < strings.ToLower(node.Children[j].Name)
		})

		return node, hasMd
	}

	rootNode, _ := scan(rootPath, 0)
	return rootNode, watchedDirs, nil
}

// FindFirstMarkdownFile traverses the tree depth-first and returns the path of the first Markdown file found.
func FindFirstMarkdownFile(node *domain.FileTreeNode) string {
	if node == nil {
		return ""
	}
	if !node.IsDir {
		return node.Path
	}
	for _, child := range node.Children {
		if !child.IsDir {
			return child.Path
		}
	}
	for _, child := range node.Children {
		if found := FindFirstMarkdownFile(child); found != "" {
			return found
		}
	}
	return ""
}
