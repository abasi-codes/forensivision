'use client';

import { CopyButton } from './copy-button';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

// Basic syntax highlighting tokens
const tokenize = (code: string, language: string): React.ReactNode[] => {
  // Simple regex-based tokenization
  const patterns: Record<string, Array<{ regex: RegExp; className: string }>> = {
    json: [
      { regex: /"[^"]*"(?=\s*:)/g, className: 'text-blue-400' }, // keys
      { regex: /"[^"]*"/g, className: 'text-green-400' }, // strings
      { regex: /\b(true|false|null)\b/g, className: 'text-purple-400' }, // booleans
      { regex: /\b\d+\.?\d*\b/g, className: 'text-orange-400' }, // numbers
    ],
    bash: [
      { regex: /#.*/g, className: 'text-slate-500' }, // comments
      { regex: /\b(curl|npm|npx|yarn|pip|python|node)\b/g, className: 'text-yellow-400' }, // commands
      { regex: /--?[\w-]+/g, className: 'text-cyan-400' }, // flags
      { regex: /"[^"]*"|'[^']*'/g, className: 'text-green-400' }, // strings
      { regex: /\$[\w_]+/g, className: 'text-purple-400' }, // variables
    ],
    javascript: [
      { regex: /\/\/.*/g, className: 'text-slate-500' }, // comments
      { regex: /\b(const|let|var|function|async|await|return|if|else|try|catch|throw|new|import|export|from|class|extends)\b/g, className: 'text-purple-400' }, // keywords
      { regex: /\b(true|false|null|undefined)\b/g, className: 'text-orange-400' }, // literals
      { regex: /"[^"]*"|'[^']*'|`[^`]*`/g, className: 'text-green-400' }, // strings
      { regex: /\b\d+\.?\d*\b/g, className: 'text-orange-400' }, // numbers
      { regex: /\b(console|fetch|Response|Error|JSON)\b/g, className: 'text-cyan-400' }, // built-ins
    ],
    python: [
      { regex: /#.*/g, className: 'text-slate-500' }, // comments
      { regex: /\b(def|class|import|from|return|if|elif|else|try|except|raise|with|as|async|await|for|in|not|and|or)\b/g, className: 'text-purple-400' }, // keywords
      { regex: /\b(True|False|None)\b/g, className: 'text-orange-400' }, // literals
      { regex: /"""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*'/g, className: 'text-green-400' }, // strings
      { regex: /\b\d+\.?\d*\b/g, className: 'text-orange-400' }, // numbers
      { regex: /\b(print|len|range|dict|list|str|int|float|requests|json)\b/g, className: 'text-cyan-400' }, // built-ins
    ],
    http: [
      { regex: /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gm, className: 'text-yellow-400' }, // methods
      { regex: /HTTP\/\d\.\d/g, className: 'text-purple-400' }, // version
      { regex: /\b\d{3}\b/g, className: 'text-orange-400' }, // status codes
      { regex: /^[\w-]+(?=:)/gm, className: 'text-cyan-400' }, // headers
    ],
  };

  const langPatterns = patterns[language] || [];

  if (langPatterns.length === 0) {
    return [code];
  }

  // Create a map of positions to tokens
  const tokens: Array<{ start: number; end: number; className: string; text: string }> = [];

  for (const { regex, className } of langPatterns) {
    const r = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = r.exec(code)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        className,
        text: match[0],
      });
    }
  }

  // Sort by start position
  tokens.sort((a, b) => a.start - b.start);

  // Filter overlapping tokens (keep first match)
  const filteredTokens: typeof tokens = [];
  let lastEnd = 0;
  for (const token of tokens) {
    if (token.start >= lastEnd) {
      filteredTokens.push(token);
      lastEnd = token.end;
    }
  }

  // Build result
  const result: React.ReactNode[] = [];
  let pos = 0;

  for (const token of filteredTokens) {
    if (pos < token.start) {
      result.push(code.slice(pos, token.start));
    }
    result.push(
      <span key={token.start} className={token.className}>
        {token.text}
      </span>
    );
    pos = token.end;
  }

  if (pos < code.length) {
    result.push(code.slice(pos));
  }

  return result;
};

export function CodeBlock({
  code,
  language = 'text',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const lines = code.split('\n');

  return (
    <div className={cn('relative rounded-lg overflow-hidden', className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-sm text-slate-400 font-mono">{filename}</span>
          <CopyButton text={code} />
        </div>
      )}
      <div className="relative bg-slate-900">
        {!filename && (
          <CopyButton text={code} className="absolute top-2 right-2 z-10" />
        )}
        <pre className={cn('p-4 overflow-x-auto text-sm', !filename && 'pr-12')}>
          <code className="font-mono text-slate-200">
            {showLineNumbers ? (
              lines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-slate-600 text-right pr-4 select-none">
                    {i + 1}
                  </span>
                  <span>{tokenize(line, language)}</span>
                </div>
              ))
            ) : (
              tokenize(code, language)
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
