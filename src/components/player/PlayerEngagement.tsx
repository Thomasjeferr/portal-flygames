'use client';

import React from 'react';
import { PlayerShareButton } from './PlayerShareButton';
import { PlayerLikeButton } from './PlayerLikeButton';
import { PlayerCommentSection } from './PlayerCommentSection';

export interface PlayerEngagementProps {
  type: 'game' | 'live';
  entityId: string;
  title: string;
  shareText: string;
  className?: string;
}

export function PlayerEngagement({
  type,
  entityId,
  title,
  shareText,
  className = '',
}: PlayerEngagementProps) {
  const base = type === 'game' ? `/api/games/${entityId}` : `/api/lives/${entityId}`;

  const handleShare = () => {
    fetch(`${base}/share`, { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  return (
    <div className={`mt-6 space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <PlayerShareButton
          title={title}
          shareText={shareText}
          url=""
          onShare={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Compartilhar
        </PlayerShareButton>
        <PlayerLikeButton
          apiBasePath={base + '/likes'}
          className="text-white/80 hover:text-white text-sm font-medium inline-flex items-center gap-1.5"
          activeClassName="text-red-400"
        />
      </div>
      <div className="pt-4 border-t border-white/10">
        <PlayerCommentSection apiBasePath={base + '/comments'} />
      </div>
    </div>
  );
}
