import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const text = String(children ?? '').replace(/\n$/, '');
  const language = /language-(\w+)/.exec(className || '')?.[1] || '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-ink/10 bg-[#211d18]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-white/45">{language || 'code'}</span>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          onClick={copy}
          className="text-white/55 hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-relaxed text-[#f4efe8]">
        <code>{text}</code>
      </pre>
    </div>
  );
}

/** Renders AI-generated markdown (notes, explanations) with copy-able code blocks. */
export function Markdown({ children, className }) {
  const content = useMemo(() => String(children ?? ''), [children]);

  return (
    <div className={cn('prose-notes', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children: preChildren }) => <>{preChildren}</>,
          code: ({ className: codeClass, children: codeChildren, ...props }) => {
            const isBlock = String(codeClass || '').includes('language-') || String(codeChildren || '').includes('\n');
            if (isBlock) return <CodeBlock className={codeClass}>{codeChildren}</CodeBlock>;
            return (
              <code className={codeClass} {...props}>
                {codeChildren}
              </code>
            );
          },
          a: ({ ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
          table: ({ ...props }) => (
            <div className="my-3 overflow-x-auto">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;
