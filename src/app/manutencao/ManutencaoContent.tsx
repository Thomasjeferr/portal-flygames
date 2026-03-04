'use client';

import { useState, useCallback } from 'react';

interface Props {
  text: string;
}

export function ManutencaoContent({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors"
      title={copied ? 'Copiado!' : 'Copiar texto'}
      aria-label={copied ? 'Copiado!' : 'Copiar texto'}
    >
      {copied ? (
        <span className="text-xs text-[#19d37a]">Copiado</span>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}
