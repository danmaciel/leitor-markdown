export interface FileDocument {
  path: string;
  name: string;
  content: string;
  updatedAt: string;
  size: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
}

export interface StartupInfo {
  initialFile?: FileDocument | null;
  initialTree?: FileTreeNode | null;
  rootDir: string;
}

export type ViewMode = 'read' | 'split' | 'edit';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}
