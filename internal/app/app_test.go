package app

import (
	"testing"
)

func TestReadSaveAndCreateMarkdownFile(t *testing.T) {
	tmpDir := t.TempDir()
	application := New(tmpDir)
	defer application.Shutdown(nil)

	doc, err := application.CreateMarkdownFile(tmpDir, "notas-teste")
	if err != nil {
		t.Fatalf("CreateMarkdownFile falhou: %v", err)
	}
	if doc.Name != "notas-teste.md" {
		t.Fatalf("esperava notas-teste.md, obteve %s", doc.Name)
	}

	updatedContent := "# Notas Atualizadas\n\n- [x] Testado com Go"
	saved, err := application.SaveMarkdownFile(doc.Path, updatedContent)
	if err != nil {
		t.Fatalf("SaveMarkdownFile falhou: %v", err)
	}
	if saved.Content != updatedContent {
		t.Fatalf("conteúdo salvo difere do esperado")
	}

	readBack, err := application.ReadMarkdownFile(doc.Path)
	if err != nil {
		t.Fatalf("ReadMarkdownFile falhou: %v", err)
	}
	if readBack.Content != updatedContent {
		t.Fatalf("conteúdo lido difere do esperado")
	}
}

func TestGetStartupInfoEmptyWithoutArgs(t *testing.T) {
	application := New("")
	defer application.Shutdown(nil)

	info, err := application.GetStartupInfo()
	if err != nil {
		t.Fatalf("GetStartupInfo falhou: %v", err)
	}
	if info.InitialFile != nil {
		t.Fatalf("esperava InitialFile == nil quando aberto sem argumentos, obteve %+v", info.InitialFile)
	}
}
