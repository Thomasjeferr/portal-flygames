type Props = {
  mediaType?: string;
  className?: string;
  /** Quando true, mostra "Vídeo" em vez de "Sem mídia" para tipos de vídeo sem thumbnail */
  hasVideoNoThumb?: boolean;
};

export function BannerPreviewPlaceholder({ mediaType = 'NONE', className = '', hasVideoNoThumb = false }: Props) {
  const isVideo = mediaType === 'YOUTUBE_VIDEO' || mediaType === 'MP4_VIDEO';
  const label = isVideo && hasVideoNoThumb ? 'Vídeo' : 'Sem mídia';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 bg-netflix-dark/80 text-netflix-light/70 ${className}`}
    >
      <span className="text-2xl" aria-hidden>
        {isVideo ? '▶' : '🖼'}
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}
