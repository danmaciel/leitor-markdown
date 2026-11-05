import React, { useRef } from 'react';
import {
  Bold,
  Italic,
  Code,
  Link,
  Table,
  CheckSquare,
  GitBranch,
  Sigma,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScroll?: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  editorRef,
  onScroll,
}) => {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = editorRef || internalRef;

  const insertSnippet = (prefix: string, suffix = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next =
      value.slice(0, start) + prefix + selected + suffix + value.slice(end);

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertSnippet('  ');
    }
  };

  return (
    <div className="markdown-editor-pane">
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => insertSnippet('**', '**', 'negrito')}
          title="Negrito"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('*', '*', 'itálico')}
          title="Itálico"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('`', '`', 'código')}
          title="Código inline"
        >
          <Code size={14} />
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('[', '](https://)', 'texto do link')}
          title="Inserir Link"
        >
          <Link size={14} />
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('\n- [ ] ', '', 'Nova tarefa')}
          title="Lista de Tarefas"
        >
          <CheckSquare size={14} />
        </button>
        <button
          type="button"
          onClick={() =>
            insertSnippet(
              '\n| Coluna 1 | Coluna 2 |\n| :--- | :--- |\n| Valor 1 | Valor 2 |\n'
            )
          }
          title="Inserir Tabela GFM"
        >
          <Table size={14} />
        </button>
        <button
          type="button"
          onClick={() =>
            insertSnippet(
              '\n```mermaid\nflowchart LR\n    A["Início"] --> B["Fim"]\n```\n'
            )
          }
          title="Inserir Diagrama Mermaid"
        >
          <GitBranch size={14} />
          <span>Mermaid</span>
        </button>
        <button
          type="button"
          onClick={() =>
            insertSnippet('\n$$\n\\sum_{i=1}^{n} x_i = S\n$$\n')
          }
          title="Inserir Bloco Matemático KaTeX"
        >
          <Sigma size={14} />
          <span>KaTeX</span>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="markdown-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={onScroll}
        spellCheck={false}
        placeholder="Digite seu Markdown aqui..."
      />
    </div>
  );
};
