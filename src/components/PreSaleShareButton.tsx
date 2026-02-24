'use client';

import React, { useState } from 'react';

interface PreSaleShareButtonProps {
  title: string;
  className?: string;
}

export function PreSaleShareButton({ title, className }: PreSaleShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const url = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}#pre-estreias-meta`
        : '';

      const shareText = `Ajude a bater a meta desta pré-estreia: ${title}`;

      if (typeof navigator !== 'undefined' && (navigator as any).share && url) {
        await (navigator as any).share({
          title: `Pré-estreia com Meta`,
          text: shareText,
          url,
        });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Silencia erros de compartilhamento/cópia
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={className}
    >
      {copied ? 'Link copiado!' : 'Compartilhar com a torcida'}
    </button>
  );
}

