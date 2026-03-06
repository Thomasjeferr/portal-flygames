'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StreamCustomPlayer } from '@/components/StreamCustomPlayer';

const POLL_INTERVAL_MS = 4000;
const WAITING_TIMEOUT_MS = 10 * 60 * 1000; // 10 min

interface LiveScheduledToLivePlayerProps {
  liveId: string;
  startAt: Date | string;
  title: string;
  thumbnailUrl?: string | null;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

type Phase = 'counting' | 'waiting' | 'playing';

export function LiveScheduledToLivePlayer({
  liveId,
  startAt,
  title,
  thumbnailUrl,
}: LiveScheduledToLivePlayerProps) {
  const router = useRouter();
  const startAtDate = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const [phase, setPhase] = useState<Phase>('counting');
  const [diff, setDiff] = useState<number | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingStartRef = useRef<number | null>(null);

  // Contagem regressiva (1s)
  useEffect(() => {
    if (phase !== 'counting') return;
    const update = () => {
      const now = Date.now();
      const target = startAtDate.getTime();
      const d = Math.max(0, Math.floor((target - now) / 1000));
      setDiff(d);
      if (d <= 0) {
        setPhase('waiting');
        waitingStartRef.current = Date.now();
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [phase, startAtDate]);

  // Polling quando em waiting
  useEffect(() => {
    if (phase !== 'waiting') return;

    const fetchStatus = async () => {
      if (waitingStartRef.current && Date.now() - waitingStartRef.current > WAITING_TIMEOUT_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      try {
        const res = await fetch(`/api/live/${liveId}/stream-status`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status === 'LIVE' && data.hlsUrl) {
          setHlsUrl(data.hlsUrl);
          setPhase('playing');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          // Atualiza a página no servidor para o badge "Agendada" mudar para "Ao vivo"
          router.refresh();
        }
      } catch {
        // continua polling
      }
    };

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [phase, liveId, router]);

  // Fase: playing
  if (phase === 'playing' && hlsUrl) {
    return (
      <div className="relative w-full">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          AO VIVO
        </div>
        <StreamCustomPlayer
          hlsUrl={hlsUrl}
          title={title}
          posterUrl={thumbnailUrl ?? undefined}
          autoplay
        />
      </div>
    );
  }

  // Fase: waiting
  if (phase === 'waiting') {
    return (
      <div className="text-center py-12">
        <p className="text-futvar-light text-lg mb-2">
          A transmissão deve começar em instantes.
        </p>
        <p className="text-futvar-light/80 text-sm">
          Aguarde… a reprodução começará automaticamente.
        </p>
        <div className="mt-4 flex justify-center">
          <span className="inline-block h-1 w-1 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>
    );
  }

  // Fase: counting
  if (diff === null) return null;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return (
    <div className="text-center py-8 md:py-12">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-futvar-light mb-8">
        Início em:{' '}
        {startAtDate.toLocaleString('pt-BR', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        })}
      </p>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        {days > 0 && (
          <div className="flex flex-col items-center min-w-[4rem]">
            <span className="text-3xl md:text-4xl font-mono font-bold text-futvar-green tabular-nums">
              {pad(days)}
            </span>
            <span className="text-sm text-futvar-light uppercase">dias</span>
          </div>
        )}
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-3xl md:text-4xl font-mono font-bold text-futvar-green tabular-nums">
            {pad(hours)}
          </span>
          <span className="text-sm text-futvar-light uppercase">horas</span>
        </div>
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-3xl md:text-4xl font-mono font-bold text-futvar-green tabular-nums">
            {pad(minutes)}
          </span>
          <span className="text-sm text-futvar-light uppercase">min</span>
        </div>
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-3xl md:text-4xl font-mono font-bold text-futvar-green tabular-nums">
            {pad(seconds)}
          </span>
          <span className="text-sm text-futvar-light uppercase">seg</span>
        </div>
      </div>
    </div>
  );
}
