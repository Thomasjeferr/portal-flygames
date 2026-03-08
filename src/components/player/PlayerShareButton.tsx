'use client';

import React, { useState } from 'react';

export interface PlayerShareButtonProps {
  title: string;
  shareText: string;
  url: string;
  /** Chamado após compartilhar com sucesso (Web Share ou copiar). Usar para registrar contagem no backend. */
  onShare?: () => void | Promise<void>;
  className?: string;
  children?: React.ReactNode;
}

export function PlayerShareButton({
  title,
  shareText,
  url,
  onShare,
  className = '',
  children,
}: PlayerShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
      if (!shareUrl) return;
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title,
          text: shareText,
          url: shareUrl,
        });
        await onShare?.();
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        await onShare?.();
      }
    } catch {
      // Silencia erros
    }
  };

  return (
    <button type="button" onClick={handleShare} className={className}>
      {children ?? (copied ? 'Link copiado!' : 'Compartilhar')}
    </button>
  );
}
