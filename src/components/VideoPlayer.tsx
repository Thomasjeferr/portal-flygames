'use client';

import { extractYouTubeVideoId, isYouTubeUrl } from '@/lib/youtube';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  const isYoutube = isYouTubeUrl(videoUrl);
  const isVimeo = /vimeo\.com/.test(videoUrl);
  const isPandaVideo = /pandavideo\.com\.br|pandavideo\.com/.test(videoUrl);

  if (isPandaVideo) {
    const embedUrl = videoUrl.includes('/embed/') ? videoUrl : videoUrl.replace(/\/$/, '');
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (isYoutube) {
    const videoId = extractYouTubeVideoId(videoUrl);
    const embedUrl = videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=0`
      : videoUrl;
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (isVimeo) {
    const id = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
    const embedUrl = `https://player.vimeo.com/video/${id}`;
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={videoUrl}
        controls
        className="w-full h-full"
        poster=""
        preload="metadata"
      >
        Seu navegador não suporta vídeos.
      </video>
    </div>
  );
}
