package domain

import (
	"path/filepath"
	"strings"
)

// FileDocument represents a Markdown file loaded from or saved to disk.
type FileDocument struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Content   string `json:"content"`
	UpdatedAt string `json:"updatedAt"`
	Size      int64  `json:"size"`
}

// FileTreeNode represents a directory or Markdown file node in the sidebar tree.
type FileTreeNode struct {
	Name     string          `json:"name"`
	Path     string          `json:"path"`
	IsDir    bool            `json:"isDir"`
	Children []*FileTreeNode `json:"children,omitempty"`
}

// StartupInfo contains the initial state returned to the frontend when the app starts.
type StartupInfo struct {
	InitialFile *FileDocument `json:"initialFile"`
	InitialTree *FileTreeNode `json:"initialTree"`
	RootDir     string        `json:"rootDir"`
}

// IsMarkdownFile checks if the given filename has a supported Markdown or text extension.
func IsMarkdownFile(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".md", ".markdown", ".mdx", ".mdown", ".mkd", ".txt":
		return true
	default:
		return false
	}
}

// ShouldIgnoreDir reports whether a directory name should be skipped when scanning a workspace.
func ShouldIgnoreDir(name string) bool {
	if strings.HasPrefix(name, ".") && name != "." {
		return true
	}
	switch name {
	case "node_modules", "dist", "build", "target", "vendor", "__pycache__":
		return true
	default:
		return false
	}
}
