import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  FilePlus,
  FolderInput,
  FileInput,
  ListTree,
  BookOpen,
} from 'lucide-react';
import { FileTreeNode, HeadingItem } from '../types';

interface FileTreeSidebarProps {
  tree: FileTreeNode | null;
  activeFilePath: string;
  headings: HeadingItem[];
  onSelectFile: (path: string) => void;
  onOpenFileDialog: () => void;
  onOpenFolderDialog: () => void;
  onCreateFile: (fileName: string) => Promise<void>;
  onJumpToHeading: (id: string) => void;
}

const TreeNodeItem: React.FC<{
  node: FileTreeNode;
  activeFilePath: string;
  filter: string;
  depth: number;
  onSelectFile: (path: string) => void;
}> = ({ node, activeFilePath, filter, depth, onSelectFile }) => {
  const [expanded, setExpanded] = useState(true);

  const matchesFilter = (n: FileTreeNode): boolean => {
    if (!filter) return true;
    if (n.name.toLowerCase().includes(filter.toLowerCase())) return true;
    if (n.children) {
      return n.children.some(matchesFilter);
    }
    return false;
  };

  if (!matchesFilter(node)) {
    return null;
  }

  if (node.isDir) {
    return (
      <div className="tree-dir-group">
        <button
          type="button"
          className="tree-item tree-dir-item"
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? (
            <FolderOpen size={15} className="tree-icon folder-icon" />
          ) : (
            <Folder size={15} className="tree-icon folder-icon" />
          )}
          <span className="tree-item-label">{node.name}</span>
        </button>

        {expanded && node.children && (
          <div className="tree-children">
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                activeFilePath={activeFilePath}
                filter={filter}
                depth={depth + 1}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = node.path === activeFilePath;

  return (
    <button
      type="button"
      className={`tree-item tree-file-item ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
      onClick={() => onSelectFile(node.path)}
      title={node.path}
    >
      <FileText size={14} className="tree-icon file-icon" />
      <span className="tree-item-label">{node.name}</span>
    </button>
  );
};

export const FileTreeSidebar: React.FC<FileTreeSidebarProps> = ({
  tree,
  activeFilePath,
  headings,
  onSelectFile,
  onOpenFileDialog,
  onOpenFolderDialog,
  onCreateFile,
  onJumpToHeading,
}) => {
  const [tab, setTab] = useState<'files' | 'outline'>('files');
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    await onCreateFile(newFileName.trim());
    setNewFileName('');
    setCreating(false);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          type="button"
          className={`sidebar-tab ${tab === 'files' ? 'active' : ''}`}
          onClick={() => setTab('files')}
        >
          <ListTree size={15} />
          <span>Arquivos</span>
        </button>
        <button
          type="button"
          className={`sidebar-tab ${tab === 'outline' ? 'active' : ''}`}
          onClick={() => setTab('outline')}
        >
          <BookOpen size={15} />
          <span>Sumário ({headings.length})</span>
        </button>
      </div>

      {tab === 'files' ? (
        <>
          <div className="sidebar-toolbar">
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={onOpenFileDialog}
              title="Abrir Arquivo Markdown (Ctrl+O)"
            >
              <FileInput size={15} />
              <span>Arquivo</span>
            </button>
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={onOpenFolderDialog}
              title="Abrir Pasta / Workspace (Ctrl+Shift+O)"
            >
              <FolderInput size={15} />
              <span>Pasta</span>
            </button>
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={() => setCreating((v) => !v)}
              title="Nova Nota Markdown"
            >
              <FilePlus size={15} />
              <span>Novo</span>
            </button>
          </div>

          {creating && (
            <form className="new-file-form" onSubmit={handleCreateSubmit}>
              <input
                type="text"
                placeholder="nome-da-nota.md"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                autoFocus
              />
              <button type="submit">Criar</button>
            </form>
          )}

          <div className="sidebar-search">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Filtrar arquivos..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="sidebar-tree-list">
            {tree ? (
              <TreeNodeItem
                node={tree}
                activeFilePath={activeFilePath}
                filter={filter}
                depth={0}
                onSelectFile={onSelectFile}
              />
            ) : (
              <div className="sidebar-empty">
                Nenhuma pasta aberta. Clique em <strong>Pasta</strong> acima.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="sidebar-outline-list">
          {headings.length === 0 ? (
            <div className="sidebar-empty">
              Nenhum título (<code>#</code>) encontrado neste documento.
            </div>
          ) : (
            headings.map((h, idx) => (
              <button
                key={`${h.id}-${idx}`}
                type="button"
                className="outline-item"
                style={{ paddingLeft: `${(h.level - 1) * 14 + 12}px` }}
                onClick={() => onJumpToHeading(h.id)}
              >
                <span className="outline-level">H{h.level}</span>
                <span className="outline-text">{h.text}</span>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
};
