'use client';

import React, { useCallback, useRef, useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  bufferedFraction: number;
  onSeek: (fraction: number) => void;
}

export function ProgressBar({ currentTime, duration, bufferedFraction, onSeek }: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progressFraction = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const clampedBuffered = Math.min(Math.max(bufferedFraction, 0), 1);

  const getFractionFromEvent = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return progressFraction;
    const rect = track.getBoundingClientRect();
    const x = clientX - rect.left;
    if (rect.width <= 0) return progressFraction;
    const fraction = x / rect.width;
    return Math.min(Math.max(fraction, 0), 1);
  }, [progressFraction]);

  const handlePointerDown = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const clientX = 'touches' in event ? event.touches[0]?.clientX : (event as React.MouseEvent).clientX;
    if (typeof clientX !== 'number') return;
    const fraction = getFractionFromEvent(clientX);
    onSeek(fraction);
    setIsDragging(true);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX =
        moveEvent instanceof TouchEvent ? moveEvent.touches[0]?.clientX : (moveEvent as MouseEvent).clientX;
      if (typeof moveClientX !== 'number') return;
      const moveFraction = getFractionFromEvent(moveClientX);
      onSeek(moveFraction);
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
  };

  return (
    <div
      ref={trackRef}
      className="relative w-full h-3 sm:h-[10px] rounded-full bg-[#2a2f2d] overflow-hidden cursor-pointer group"
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      aria-label="Barra de progresso"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={duration || 0}
      aria-valuenow={currentTime || 0}
    >
      {/* Buffer */}
      <div
        className="absolute inset-y-0 left-0 bg-[#414644]"
        style={{ width: `${clampedBuffered * 100}%` }}
      />

      {/* Progresso */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#19d37a] to-[#0fc07a]"
        style={{ width: `${progressFraction * 100}%` }}
      />

      {/* Knob */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-black/60 border border-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ left: `${progressFraction * 100}%` }}
      />

      {/* Área maior para facilitar o toque em mobile */}
      <div
        className={`absolute -inset-y-2 left-0 right-0 ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
        aria-hidden="true"
      />
    </div>
  );
}

