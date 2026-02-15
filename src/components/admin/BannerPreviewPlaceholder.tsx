type Props = {
  mediaType?: string;
  className?: string;
};

export function BannerPreviewPlaceholder({ mediaType = 'NONE', className = '' }: Props) {
  const isVideo = mediaType === 'YOUTUBE_VIDEO' || mediaType === 'MP4_VIDEO';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 bg-netflix-dark/80 text-netflix-light/70 ${className}`}
    >
      <span className="text-2xl" aria-hidden>
        {isVideo ? '▶' : '🖼'}
      </span>
      <span className="text-xs">Sem mídia</span>
    </div>
  );
}
