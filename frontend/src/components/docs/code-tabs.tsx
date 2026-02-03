'use client';

import { useState, useEffect } from 'react';
import { CodeBlock } from './code-block';
import { cn } from '@/lib/utils';

interface CodeExample {
  language: string;
  label: string;
  code: string;
}

interface CodeTabsProps {
  examples: CodeExample[];
  className?: string;
}

const STORAGE_KEY = 'forensivision-docs-code-lang';

export function CodeTabs({ examples, className }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const index = examples.findIndex((e) => e.language === stored);
      if (index !== -1) {
        setActiveTab(index);
      }
    }
  }, [examples]);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    localStorage.setItem(STORAGE_KEY, examples[index].language);
  };

  return (
    <div className={cn('rounded-lg overflow-hidden border border-slate-800', className)}>
      {/* Tabs */}
      <div className="flex bg-slate-800 border-b border-slate-700">
        {examples.map((example, i) => (
          <button
            key={example.language}
            onClick={() => handleTabChange(i)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === i
                ? 'text-white bg-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {example.label}
          </button>
        ))}
      </div>

      {/* Code */}
      <CodeBlock
        code={examples[activeTab].code}
        language={examples[activeTab].language}
      />
    </div>
  );
}
