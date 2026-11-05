package workspace

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBuildDirectoryTreeFiltersCorrectly(t *testing.T) {
	tmpDir := t.TempDir()

	_ = os.MkdirAll(filepath.Join(tmpDir, "docs"), 0o755)
	_ = os.MkdirAll(filepath.Join(tmpDir, "node_modules", "pkg"), 0o755)
	_ = os.WriteFile(filepath.Join(tmpDir, "README.md"), []byte("# Readme"), 0o644)
	_ = os.WriteFile(filepath.Join(tmpDir, "docs", "guia.md"), []byte("# Guia"), 0o644)
	_ = os.WriteFile(filepath.Join(tmpDir, "node_modules", "pkg", "ignore.md"), []byte("# Ignorar"), 0o644)
	_ = os.WriteFile(filepath.Join(tmpDir, "binario.png"), []byte{0x89, 0x50}, 0o644)

	tree, _, err := BuildDirectoryTree(tmpDir)
	if err != nil {
		t.Fatalf("BuildDirectoryTree falhou: %v", err)
	}

	if len(tree.Children) != 2 {
		t.Fatalf("esperava 2 itens (pasta docs + README.md), obteve %d", len(tree.Children))
	}
	if !tree.Children[0].IsDir || tree.Children[0].Name != "docs" {
		t.Fatalf("esperava pasta docs como primeiro item, obteve %+v", tree.Children[0])
	}
	if tree.Children[1].IsDir || tree.Children[1].Name != "README.md" {
		t.Fatalf("esperava README.md como segundo item, obteve %+v", tree.Children[1])
	}
}
