import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { Copy, Check } from 'lucide-react';
import { MermaidBlock } from './MermaidBlock';

interface MarkdownPreviewProps {
  content: string;
  theme: 'dark' | 'light';
  onToggleTask?: (taskIndex: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
}

const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
};

const CodeBlockWrapper: React.FC<{
  language: string;
  rawCode: string;
  children: React.ReactNode;
}> = ({ language, rawCode, children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawCode.replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang-badge">{language || 'texto'}</span>
        <button
          type="button"
          className="code-action-btn"
          onClick={handleCopy}
          title="Copiar código"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="code-block-pre">{children}</pre>
    </div>
  );
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  theme,
  onToggleTask,
  containerRef,
  onScroll,
}) => {
  let checkboxCounter = 0;

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="markdown-preview-pane"
    >
      <article className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            rehypeRaw,
            rehypeSlug,
            rehypeKatex,
            [rehypeHighlight, { detect: true, ignoreMissing: true }],
          ]}
          components={{
            pre({ children }) {
              if (React.isValidElement(children)) {
                const childProps = children.props as {
                  className?: string;
                  children?: React.ReactNode;
                };
                const className = childProps.className || '';
                const match = /language-([\w-]+)/.exec(className);
                const lang = match ? match[1].toLowerCase() : '';
                const rawText = extractText(childProps.children);

                if (lang === 'mermaid') {
                  return <MermaidBlock code={rawText} theme={theme} />;
                }

                return (
                  <CodeBlockWrapper language={lang} rawCode={rawText}>
                    {children}
                  </CodeBlockWrapper>
                );
              }
              return <pre>{children}</pre>;
            },
            input(props) {
              if (props.type === 'checkbox') {
                const currentIdx = checkboxCounter++;
                return (
                  <input
                    type="checkbox"
                    checked={ Boolean(props.checked) }
                    onChange={() => onToggleTask?.(currentIdx)}
                    className="task-checkbox"
                    title="Clique para alternar tarefa"
                  />
                );
              }
              return <input {...props} />;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
};
