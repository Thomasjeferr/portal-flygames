'use client';

import { useEffect, useRef } from 'react';

interface StreamCustomPlayerProps {
  hlsUrl: string;
  title: string;
}

export function StreamCustomPlayer({ hlsUrl }: StreamCustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    if (!hlsUrl || !containerRef.current) return;

    let mounted = true;
    const initPlayer = async () => {
      const videojs = (await import('video.js')).default;
      await import('videojs-contrib-quality-levels');
      await import('videojs-contrib-quality-menu');
      await import('videojs-contrib-quality-menu/dist/videojs-contrib-quality-menu.css');
      if (!mounted || !containerRef.current) return;

      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      const video = document.createElement('video');
      video.className = 'video-js vjs-big-play-centered vjs-futvar';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(video);

      const playerOptions: Record<string, unknown> = {
        controls: true,
        autoplay: false,
        preload: 'metadata',
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        html5: {
          vhs: { overrideNative: true },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
      };

      const player = videojs(video, playerOptions);

      player.src({ src: hlsUrl, type: 'application/x-mpegURL' });

      try {
        if (typeof player.qualityMenu === 'function') {
          player.qualityMenu();
        }
      } catch {
        // Plugin de qualidade pode falhar em alguns navegadores
      }

      playerRef.current = player;
    };

    initPlayer();
    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [hlsUrl]);

  return (
    <div
      className="stream-custom-player relative w-full aspect-video bg-black rounded-lg overflow-hidden"
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style jsx global>{`
        .stream-custom-player {
          --vjs-primary: #00d26a;
          --vjs-secondary: #00a854;
          border-radius: 0.5rem;
          overflow: hidden;
          position: relative;
        }
        .stream-custom-player .video-js {
          font-family: inherit;
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .stream-custom-player .vjs-tech {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .stream-custom-player .vjs-big-play-button {
          position: absolute;
          background-color: rgba(0, 210, 106, 0.9);
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          line-height: 80px;
          font-size: 3rem;
          left: 50%;
          top: 50%;
          margin-left: -40px;
          margin-top: -40px;
          transform: none;
        }
        .stream-custom-player .vjs-big-play-button:hover {
          background-color: rgba(0, 210, 106, 1);
        }
        .stream-custom-player .vjs-control-bar {
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
          opacity: 1;
          transition: opacity 0.2s ease;
          z-index: 10;
        }
        .stream-custom-player .video-js.vjs-has-started.vjs-user-inactive.vjs-playing .vjs-control-bar {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }
        .stream-custom-player .video-js:hover .vjs-control-bar,
        .stream-custom-player .video-js.vjs-user-active .vjs-control-bar {
          opacity: 1;
          pointer-events: auto;
        }
        .stream-custom-player .vjs-play-progress,
        .stream-custom-player .vjs-volume-level {
          background-color: #00d26a;
        }
        .stream-custom-player .vjs-slider {
          background-color: rgba(255, 255, 255, 0.3);
        }
        .stream-custom-player .vjs-load-progress {
          background-color: rgba(255, 255, 255, 0.2);
        }
        .stream-custom-player .vjs-play-progress:before {
          font-size: 1em;
        }
      `}</style>
    </div>
  );
}
