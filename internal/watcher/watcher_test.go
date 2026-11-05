package watcher

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestWatcherDetectsExternalChanges(t *testing.T) {
	tmpDir := t.TempDir()
	mdFile := filepath.Join(tmpDir, "live.md")
	if err := os.WriteFile(mdFile, []byte("# Inicial"), 0o644); err != nil {
		t.Fatal(err)
	}

	changedCh := make(chan string, 4)
	fw, err := New(func(path string) {
		changedCh <- path
	}, nil)
	if err != nil {
		t.Fatalf("watcher.New falhou: %v", err)
	}
	defer fw.Close()

	if err := fw.WatchFile(mdFile); err != nil {
		t.Fatalf("WatchFile falhou: %v", err)
	}

	time.Sleep(50 * time.Millisecond)
	if err := os.WriteFile(mdFile, []byte("# Modificado Externamente"), 0o644); err != nil {
		t.Fatal(err)
	}

	select {
	case got := <-changedCh:
		if got != mdFile {
			t.Fatalf("esperava evento para %s, recebeu %s", mdFile, got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout aguardando notificação fsnotify de live reload")
	}
}
