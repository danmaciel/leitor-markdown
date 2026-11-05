import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import './App.css';
import {
  PanelLeft,
  Eye,
  Columns2,
  PenLine,
  Save,
  Sun,
  Moon,
  Radio,
  CheckCircle2,
  FileInput,
  FolderInput,
  Sparkles,
  FileText,
  Clock,
} from 'lucide-react';
import { FileDocument, FileTreeNode, HeadingItem, ViewMode } from './types';
import {
  getStartupInfo,
  loadSampleWorkspace,
  readMarkdownFile,
  saveMarkdownFile,
  createMarkdownFile,
  listDirectory,
  selectFileDialog,
  selectFolderDialog,
  onFileChanged,
  onTreeChanged,
} from './wailsBridge';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { MarkdownPreview } from './components/MarkdownPreview';
import { MarkdownEditor } from './components/MarkdownEditor';

const RECENT_FILES_KEY = 'leitor-markdown:recent-files';

interface RecentFileEntry {
  path: string;
  name: string;
}

function loadRecentFiles(): RecentFileEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRecentFile(entry: RecentFileEntry): RecentFileEntry[] {
  const current = loadRecentFiles().filter((f) => f.path !== entry.path);
  const next = [entry, ...current].slice(0, 8);
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u00C0-\u017F-]/g, '')
    .replace(/\s+/g, '-');
}

function extractHeadings(markdown: string): HeadingItem[] {
  const lines = markdown.split('\n');
  const items: HeadingItem[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (match) {
      const level = match[1].length;
      const rawText = match[2].replace(/[`*_~]/g, '').trim();
      items.push({
        id: slugifyHeading(rawText),
        text: rawText,
        level,
      });
    }
  }
  return items;
}

function findFirstMdInTree(node: FileTreeNode | null): string {
  if (!node) return '';
  if (!node.isDir) return node.path;
  if (node.children) {
    for (const c of node.children) {
      if (!c.isDir) return c.path;
    }
    for (const c of node.children) {
      const found = findFirstMdInTree(c);
      if (found) return found;
    }
  }
  return '';
}

export function App() {
  const [doc, setDoc] = useState<FileDocument | null>(null);
  const [content, setContent] = useState<string>('');
  const [savedContent, setSavedContent] = useState<string>('');
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [rootDir, setRootDir] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('read');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [livePulse, setLivePulse] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Selecione um arquivo ou pasta para começar'
  );
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>(() =>
    loadRecentFiles()
  );

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef<boolean>(false);

  const isDirty = doc !== null && content !== savedContent;

  const applyDocument = useCallback(
    (nextDoc: FileDocument, flashLive = false) => {
      setDoc(nextDoc);
      setContent(nextDoc.content);
      setSavedContent(nextDoc.content);
      setRecentFiles(saveRecentFile({ path: nextDoc.path, name: nextDoc.name }));
      if (flashLive) {
        setLivePulse(true);
        setStatusMessage(`Atualizado via Live Reload (${nextDoc.updatedAt})`);
        setTimeout(() => setLivePulse(false), 1600);
      } else {
        setStatusMessage(`Arquivo aberto: ${nextDoc.name}`);
      }
    },
    []
  );

  useEffect(() => {
    getStartupInfo()
      .then((info) => {
        if (info.initialTree) setTree(info.initialTree);
        if (info.rootDir) setRootDir(info.rootDir);
        if (info.initialFile) {
          applyDocument(info.initialFile);
        }
      })
      .catch((err) => {
        setStatusMessage(`Erro ao iniciar: ${err}`);
      });
  }, [applyDocument]);

  useEffect(() => {
    const offFile = onFileChanged((updatedDoc) => {
      applyDocument(updatedDoc, true);
    });
    const offTree = onTreeChanged((updatedTree) => {
      setTree(updatedTree);
    });
    return () => {
      offFile();
      offTree();
    };
  }, [applyDocument]);

  const handleSave = useCallback(async () => {
    if (!doc?.path) return;
    try {
      const saved = await saveMarkdownFile(doc.path, content);
      setDoc(saved);
      setSavedContent(saved.content);
      setStatusMessage(`Salvo às ${saved.updatedAt}`);
    } catch (err: any) {
      setStatusMessage(`Erro ao salvar: ${err?.message || err}`);
    }
  }, [doc, content]);

  const handleSelectFile = useCallback(
    async (path: string) => {
      try {
        const loaded = await readMarkdownFile(path);
        applyDocument(loaded);
        const parentDir = path.substring(0, path.lastIndexOf('/'));
        if (parentDir && !tree) {
          listDirectory(parentDir)
            .then((dirTree) => {
              setTree(dirTree);
              setRootDir(parentDir);
            })
            .catch(() => {});
        }
      } catch (err: any) {
        setStatusMessage(`Erro ao abrir arquivo: ${err?.message || err}`);
      }
    },
    [applyDocument, tree]
  );

  const handleOpenFileDialog = useCallback(async () => {
    try {
      const selected = await selectFileDialog();
      if (selected) {
        applyDocument(selected);
        const parentDir = selected.path.substring(
          0,
          selected.path.lastIndexOf('/')
        );
        if (parentDir) {
          listDirectory(parentDir)
            .then((dirTree) => {
              setTree(dirTree);
              setRootDir(parentDir);
            })
            .catch(() => {});
        }
      }
    } catch (err: any) {
      setStatusMessage(`Erro ao selecionar arquivo: ${err?.message || err}`);
    }
  }, [applyDocument]);

  const handleOpenFolderDialog = useCallback(async () => {
    try {
      const selectedTree = await selectFolderDialog();
      if (selectedTree) {
        setTree(selectedTree);
        setRootDir(selectedTree.path);
        setSidebarOpen(true);
        setStatusMessage(`Pasta aberta: ${selectedTree.name}`);
        const firstMd = findFirstMdInTree(selectedTree);
        if (firstMd) {
          const loaded = await readMarkdownFile(firstMd);
          applyDocument(loaded);
        }
      }
    } catch (err: any) {
      setStatusMessage(`Erro ao selecionar pasta: ${err?.message || err}`);
    }
  }, [applyDocument]);

  const handleLoadSamples = useCallback(async () => {
    try {
      const info = await loadSampleWorkspace();
      if (info.initialTree) setTree(info.initialTree);
      if (info.rootDir) setRootDir(info.rootDir);
      if (info.initialFile) applyDocument(info.initialFile);
    } catch (err: any) {
      setStatusMessage(`Erro ao carregar exemplos: ${err?.message || err}`);
    }
  }, [applyDocument]);

  const handleCreateFile = useCallback(
    async (fileName: string) => {
      const targetDir = rootDir || tree?.path || '.';
      try {
        const created = await createMarkdownFile(targetDir, fileName);
        applyDocument(created);
        setViewMode('split');
      } catch (err: any) {
        setStatusMessage(`Erro ao criar nota: ${err?.message || err}`);
      }
    },
    [rootDir, tree, applyDocument]
  );

  const handleToggleTask = useCallback(
    async (taskIndex: number) => {
      let currentMatch = 0;
      const lines = content.split('\n');
      let inFence = false;

      const updatedLines = lines.map((line) => {
        if (line.trim().startsWith('```')) {
          inFence = !inFence;
          return line;
        }
        if (inFence) return line;

        const taskRegex = /^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/;
        const match = taskRegex.exec(line);
        if (match) {
          if (currentMatch === taskIndex) {
            currentMatch++;
            const nextState = match[2] === ' ' ? 'x' : ' ';
            return `${match[1]}${nextState}${match[3]}`;
          }
          currentMatch++;
        }
        return line;
      });

      const nextContent = updatedLines.join('\n');
      setContent(nextContent);
      if (doc?.path) {
        try {
          const saved = await saveMarkdownFile(doc.path, nextContent);
          setDoc(saved);
          setSavedContent(saved.content);
          setStatusMessage(`Tarefa atualizada (${saved.updatedAt})`);
        } catch {
          // Mantém no estado local caso falhe
        }
      }
    },
    [content, doc]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setViewMode((prev) =>
          prev === 'read' ? 'split' : prev === 'split' ? 'edit' : 'read'
        );
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (e.shiftKey) {
          handleOpenFolderDialog();
        } else {
          handleOpenFileDialog();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleOpenFileDialog, handleOpenFolderDialog]);

  // Synchronized scroll in Split View
  const handleEditorScroll = () => {
    if (viewMode !== 'split' || isSyncingScroll.current) return;
    const ed = editorRef.current;
    const pr = previewRef.current;
    if (!ed || !pr) return;

    isSyncingScroll.current = true;
    const ratio =
      ed.scrollTop / Math.max(1, ed.scrollHeight - ed.clientHeight);
    pr.scrollTop = ratio * Math.max(0, pr.scrollHeight - pr.clientHeight);
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handlePreviewScroll = () => {
    if (viewMode !== 'split' || isSyncingScroll.current) return;
    const ed = editorRef.current;
    const pr = previewRef.current;
    if (!ed || !pr) return;

    isSyncingScroll.current = true;
    const ratio =
      pr.scrollTop / Math.max(1, pr.scrollHeight - pr.clientHeight);
    ed.scrollTop = ratio * Math.max(0, ed.scrollHeight - ed.clientHeight);
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleJumpToHeading = (id: string) => {
    const container = previewRef.current;
    if (!container) return;
    const target = container.querySelector(`#${CSS.escape(id)}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const headings = useMemo(() => extractHeadings(content), [content]);

  const stats = useMemo(() => {
    const trimmed = content.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = doc ? content.split('\n').length : 0;
    const readingTime = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    return { words, lines, readingTime };
  }, [content, doc]);

  return (
    <div className={`app-shell theme-${theme}`}>
      {/* Top Header */}
      <header className="top-header">
        <div className="header-left">
          <button
            type="button"
            className={`icon-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
            title="Mostrar/Ocultar Sidebar (Ctrl+B)"
          >
            <PanelLeft size={17} />
          </button>

          <button
            type="button"
            className="header-open-btn"
            onClick={handleOpenFileDialog}
            title="Selecionar Arquivo Markdown (Ctrl+O)"
          >
            <FileInput size={15} />
            <span>Abrir Arquivo</span>
          </button>

          <button
            type="button"
            className="header-open-btn"
            onClick={handleOpenFolderDialog}
            title="Selecionar Pasta (Ctrl+Shift+O)"
          >
            <FolderInput size={15} />
            <span>Abrir Pasta</span>
          </button>

          {doc && (
            <>
              <div className="file-title-group">
                <span className="file-name">{doc.name}</span>
                {isDirty && (
                  <span className="dirty-badge" title="Alterações não salvas">
                    ● Modificado
                  </span>
                )}
              </div>

              <div
                className={`live-indicator ${livePulse ? 'pulse' : ''}`}
                title="Monitorando alterações no disco em tempo real via Linux fsnotify"
              >
                <Radio size={13} />
                <span>Live Reload</span>
              </div>
            </>
          )}
        </div>

        <div className="header-center">
          {doc && (
            <div className="view-mode-switcher">
              <button
                type="button"
                className={`mode-btn ${viewMode === 'read' ? 'active' : ''}`}
                onClick={() => setViewMode('read')}
                title="Modo Leitura"
              >
                <Eye size={15} />
                <span>Leitura</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Modo Dividido Lado a Lado (Ctrl+\)"
              >
                <Columns2 size={15} />
                <span>Split View</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
                onClick={() => setViewMode('edit')}
                title="Modo Editor"
              >
                <PenLine size={15} />
                <span>Editor</span>
              </button>
            </div>
          )}
        </div>

        <div className="header-right">
          {doc && (
            <button
              type="button"
              className={`save-btn ${isDirty ? 'dirty' : ''}`}
              onClick={handleSave}
              disabled={!isDirty}
              title="Salvar alterações no disco (Ctrl+S)"
            >
              {isDirty ? <Save size={15} /> : <CheckCircle2 size={15} />}
              <span>{isDirty ? 'Salvar' : 'Salvo'}</span>
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Alternar Tema Escuro / Claro"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="workspace-body">
        {sidebarOpen && (
          <FileTreeSidebar
            tree={tree}
            activeFilePath={doc?.path || ''}
            headings={headings}
            onSelectFile={handleSelectFile}
            onOpenFileDialog={handleOpenFileDialog}
            onOpenFolderDialog={handleOpenFolderDialog}
            onCreateFile={handleCreateFile}
            onJumpToHeading={handleJumpToHeading}
          />
        )}

        {doc ? (
          <main className={`content-area mode-${viewMode}`}>
            {(viewMode === 'edit' || viewMode === 'split') && (
              <MarkdownEditor
                value={content}
                onChange={setContent}
                editorRef={editorRef}
                onScroll={handleEditorScroll}
              />
            )}

            {(viewMode === 'read' || viewMode === 'split') && (
              <MarkdownPreview
                content={content}
                theme={theme}
                onToggleTask={handleToggleTask}
                containerRef={previewRef}
                onScroll={handlePreviewScroll}
              />
            )}
          </main>
        ) : (
          <main className="empty-picker-screen">
            <div className="picker-card">
              <div className="picker-icon-badge">
                <FileText size={34} />
              </div>
              <h1>Leitor Markdown</h1>
              <p className="picker-subtitle">
                Selecione um arquivo Markdown ou uma pasta de projetos para
                visualizar com suporte a GFM, diagramas Mermaid, fórmulas KaTeX
                e Live Reload em tempo real.
              </p>

              <div className="picker-actions">
                <button
                  type="button"
                  className="picker-primary-btn"
                  onClick={handleOpenFileDialog}
                >
                  <FileInput size={18} />
                  <span>Selecionar Arquivo (.md)</span>
                </button>

                <button
                  type="button"
                  className="picker-secondary-btn"
                  onClick={handleOpenFolderDialog}
                >
                  <FolderInput size={18} />
                  <span>Abrir Pasta / Projeto</span>
                </button>
              </div>

              <button
                type="button"
                className="picker-sample-btn"
                onClick={handleLoadSamples}
              >
                <Sparkles size={15} />
                <span>Abrir exemplos interativos (Mermaid, KaTeX e GFM)</span>
              </button>

              {recentFiles.length > 0 && (
                <div className="recent-files-section">
                  <div className="recent-files-header">
                    <Clock size={14} />
                    <span>Arquivos Recentes</span>
                  </div>
                  <div className="recent-files-list">
                    {recentFiles.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        className="recent-file-item"
                        onClick={() => handleSelectFile(item.path)}
                        title={item.path}
                      >
                        <FileText size={14} className="file-icon" />
                        <span className="recent-file-name">{item.name}</span>
                        <span className="recent-file-path">{item.path}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          <span className="status-msg">{statusMessage}</span>
          {doc?.path && <span className="status-path">{doc.path}</span>}
        </div>
        {doc && (
          <div className="status-right">
            <span>{stats.words} palavras</span>
            <span>•</span>
            <span>{stats.lines} linhas</span>
            <span>•</span>
            <span>~{stats.readingTime} min de leitura</span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;
