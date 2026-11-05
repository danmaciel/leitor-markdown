package watcher

import (
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"

	"leitor-markdown/internal/domain"
)

// Watcher monitors the active Markdown file and workspace directory tree using fsnotify.
type Watcher struct {
	mu             sync.Mutex
	fsWatcher      *fsnotify.Watcher
	watchedFile    string
	watchedRootDir string
	watchedDirs    map[string]bool
	lastSelfSave   map[string]time.Time
	onFileChanged  func(path string)
	onTreeChanged  func(rootDir string)
	stopCh         chan struct{}
	closed         bool
}

// New creates and starts a new file and directory Watcher.
func New(onFileChanged func(path string), onTreeChanged func(rootDir string)) (*Watcher, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	fw := &Watcher{
		fsWatcher:     w,
		watchedDirs:   make(map[string]bool),
		lastSelfSave:  make(map[string]time.Time),
		onFileChanged: onFileChanged,
		onTreeChanged: onTreeChanged,
		stopCh:        make(chan struct{}),
	}

	go fw.loop()
	return fw, nil
}

// MarkSelfSave records a timestamp for a file saved by the application itself to suppress echo events.
func (fw *Watcher) MarkSelfSave(path string) {
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	fw.mu.Lock()
	defer fw.mu.Unlock()
	fw.lastSelfSave[abs] = time.Now()
}

// WatchFile registers the target file's parent directory for inotify events.
func (fw *Watcher) WatchFile(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	parentDir := filepath.Dir(abs)

	fw.mu.Lock()
	defer fw.mu.Unlock()
	if fw.closed {
		return nil
	}

	fw.watchedFile = abs
	if !fw.watchedDirs[parentDir] {
		if err := fw.fsWatcher.Add(parentDir); err == nil {
			fw.watchedDirs[parentDir] = true
		}
	}
	return nil
}

// WatchDirectoryTree registers the root directory and its subdirectories for tree change events.
func (fw *Watcher) WatchDirectoryTree(rootDir string, dirs []string) error {
	absRoot, err := filepath.Abs(rootDir)
	if err != nil {
		return err
	}

	fw.mu.Lock()
	defer fw.mu.Unlock()
	if fw.closed {
		return nil
	}

	fw.watchedRootDir = absRoot
	allDirs := append([]string{absRoot}, dirs...)
	for _, d := range allDirs {
		absDir, err := filepath.Abs(d)
		if err != nil {
			continue
		}
		if !fw.watchedDirs[absDir] {
			if err := fw.fsWatcher.Add(absDir); err == nil {
				fw.watchedDirs[absDir] = true
			}
		}
	}
	return nil
}

// Close stops the watcher loop and releases OS resources.
func (fw *Watcher) Close() error {
	fw.mu.Lock()
	if fw.closed {
		fw.mu.Unlock()
		return nil
	}
	fw.closed = true
	close(fw.stopCh)
	fw.mu.Unlock()
	return fw.fsWatcher.Close()
}

func (fw *Watcher) loop() {
	var (
		fileTimer *time.Timer
		treeTimer *time.Timer
	)

	triggerFile := func(target string) {
		if fileTimer != nil {
			fileTimer.Stop()
		}
		fileTimer = time.AfterFunc(100*time.Millisecond, func() {
			if fw.onFileChanged != nil {
				fw.onFileChanged(target)
			}
		})
	}

	triggerTree := func(root string) {
		if treeTimer != nil {
			treeTimer.Stop()
		}
		treeTimer = time.AfterFunc(180*time.Millisecond, func() {
			if fw.onTreeChanged != nil {
				fw.onTreeChanged(root)
			}
		})
	}

	for {
		select {
		case <-fw.stopCh:
			return
		case event, ok := <-fw.fsWatcher.Events:
			if !ok {
				return
			}
			evPath, err := filepath.Abs(event.Name)
			if err != nil {
				evPath = event.Name
			}

			fw.mu.Lock()
			watchedFile := fw.watchedFile
			watchedRoot := fw.watchedRootDir
			lastSave, hasSave := fw.lastSelfSave[evPath]
			fw.mu.Unlock()

			if hasSave && time.Since(lastSave) < 300*time.Millisecond {
				continue
			}

			if watchedFile != "" && evPath == watchedFile {
				if event.Has(fsnotify.Write) || event.Has(fsnotify.Create) || event.Has(fsnotify.Chmod) {
					triggerFile(watchedFile)
				}
			}

			if watchedRoot != "" && domain.IsMarkdownFile(evPath) {
				if event.Has(fsnotify.Create) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
					triggerTree(watchedRoot)
				}
			}
		case _, ok := <-fw.fsWatcher.Errors:
			if !ok {
				return
			}
		}
	}
}
