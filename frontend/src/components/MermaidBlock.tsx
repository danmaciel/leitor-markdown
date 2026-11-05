import React, { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { Code2, Copy, Check, AlertTriangle } from 'lucide-react';

interface MermaidBlockProps {
  code: string;
  theme: 'dark' | 'light';
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, theme }) => {
  const uniqueId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      const trimmed = code.trim();
      if (!trimmed) {
        setSvg('');
        setError(null);
        return;
      }

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        });

        const renderId = `mermaid-${uniqueId}-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(renderId, trimmed);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Erro de sintaxe no diagrama Mermaid');
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, theme, uniqueId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mermaid-container">
      <div className="code-block-header">
        <span className="code-lang-badge">mermaid</span>
        <div className="code-block-actions">
          <button
            type="button"
            className="code-action-btn"
            onClick={() => setShowRaw((v) => !v)}
            title="Alternar entre diagrama e código-fonte"
          >
            <Code2 size={14} />
            <span>{showRaw ? 'Ver Diagrama' : 'Fonte'}</span>
          </button>
          <button
            type="button"
            className="code-action-btn"
            onClick={handleCopy}
            title="Copiar código Mermaid"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="mermaid-raw-code">
          <code>{code}</code>
        </pre>
      ) : error ? (
        <div className="mermaid-error">
          <div className="mermaid-error-title">
            <AlertTriangle size={16} />
            <span>Sintaxe Mermaid inválida</span>
          </div>
          <pre>{error}</pre>
        </div>
      ) : (
        <div
          className="mermaid-svg-wrapper"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
};
