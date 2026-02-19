'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LiveCountdownProps {
  startAt: Date;
  title: string;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function LiveCountdown({ startAt, title }: LiveCountdownProps) {
  const [diff, setDiff] = useState<number | null>(null);
  const router = useRouter();
  const refreshDone = useRef(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const target = new Date(startAt).getTime();
      const d = Math.max(0, Math.floor((target - now) / 1000));
      setDiff(d);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [startAt]);

  // Quando a contagem chega a zero, revalidar a página para buscar status LIVE e exibir o player.
  useEffect(() => {
    if (diff !== 0 || refreshDone.current) return;
    refreshDone.current = true;
    router.refresh();
    const t2 = setTimeout(() => router.refresh(), 2500);
    const t3 = setTimeout(() => router.refresh(), 6000);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [diff, router]);

  if (diff === null) return null;
  if (diff <= 0) {
    return (
      <div className="text-center py-12">
        <p className="text-futvar-light text-lg mb-2">
          A transmissão deve começar em instantes.
        </p>
        <p className="text-futvar-light/80 text-sm">
          Atualizando a página automaticamente…
        </p>
      </div>
    );
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return (
    <div className="text-center py-8 md:py-12">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-futvar-light mb-8">
        Início em:{' '}
        {new Date(startAt).toLocaleString('pt-BR', {
          dateStyle: 'long',
          timeStyle: 'short',
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
