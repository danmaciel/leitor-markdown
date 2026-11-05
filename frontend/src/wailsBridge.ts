import { FileDocument, FileTreeNode, StartupInfo } from './types';

interface WailsAppBinding {
  GetStartupInfo(): Promise<StartupInfo>;
  LoadSampleWorkspace(): Promise<StartupInfo>;
  ReadMarkdownFile(path: string): Promise<FileDocument>;
  SaveMarkdownFile(path: string, content: string): Promise<FileDocument>;
  CreateMarkdownFile(dirPath: string, fileName: string): Promise<FileDocument>;
  ListDirectory(dirPath: string): Promise<FileTreeNode>;
  SelectFileDialog(): Promise<FileDocument | null>;
  SelectFolderDialog(): Promise<FileTreeNode | null>;
}

declare global {
  interface Window {
    go?: {
      app?: {
        App?: WailsAppBinding;
      };
      main?: {
        App?: WailsAppBinding;
      };
    };
    runtime?: {
      EventsOn(eventName: string, callback: (...data: any[]) => void): () => void;
      EventsOff(eventName: string): void;
    };
  }
}

const getApp = (): WailsAppBinding | undefined =>
  window.go?.app?.App ?? window.go?.main?.App;

export async function getStartupInfo(): Promise<StartupInfo> {
  const app = getApp();
  if (app) {
    return app.GetStartupInfo();
  }
  return {
    rootDir: '',
    initialFile: null,
    initialTree: null,
  };
}

export async function loadSampleWorkspace(): Promise<StartupInfo> {
  const app = getApp();
  if (!app) {
    throw new Error('Backend Wails indisponível');
  }
  return app.LoadSampleWorkspace();
}

export async function readMarkdownFile(path: string): Promise<FileDocument> {
  const app = getApp();
  if (!app) {
    throw new Error('Backend Wails indisponível');
  }
  return app.ReadMarkdownFile(path);
}

export async function saveMarkdownFile(path: string, content: string): Promise<FileDocument> {
  const app = getApp();
  if (!app) {
    throw new Error('Backend Wails indisponível');
  }
  return app.SaveMarkdownFile(path, content);
}

export async function createMarkdownFile(dirPath: string, fileName: string): Promise<FileDocument> {
  const app = getApp();
  if (!app) {
    throw new Error('Backend Wails indisponível');
  }
  return app.CreateMarkdownFile(dirPath, fileName);
}

export async function listDirectory(dirPath: string): Promise<FileTreeNode> {
  const app = getApp();
  if (!app) {
    throw new Error('Backend Wails indisponível');
  }
  return app.ListDirectory(dirPath);
}

export async function selectFileDialog(): Promise<FileDocument | null> {
  const app = getApp();
  if (!app) {
    return null;
  }
  return app.SelectFileDialog();
}

export async function selectFolderDialog(): Promise<FileTreeNode | null> {
  const app = getApp();
  if (!app) {
    return null;
  }
  return app.SelectFolderDialog();
}

export function onFileChanged(cb: (doc: FileDocument) => void): () => void {
  if (window.runtime?.EventsOn) {
    return window.runtime.EventsOn('markdown:file-changed', (doc: FileDocument) => {
      if (doc) cb(doc);
    });
  }
  return () => {};
}

export function onTreeChanged(cb: (tree: FileTreeNode) => void): () => void {
  if (window.runtime?.EventsOn) {
    return window.runtime.EventsOn('markdown:tree-changed', (tree: FileTreeNode) => {
      if (tree) cb(tree);
    });
  }
  return () => {};
}
