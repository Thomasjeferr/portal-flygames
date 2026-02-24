'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Game {
  id: string;
  title: string;
  status: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  metaEnabled: boolean;
  metaExtraPerTeam: number | null;
  baselineHomeSubs: number | null;
  baselineAwaySubs: number | null;
  metaHomeTotal: number | null;
  metaAwayTotal: number | null;
  specialCategory: { name: string } | null;
  homeTeam: { id: string; name: string; slug: string } | null;
  awayTeam: { id: string; name: string; slug: string } | null;
}

export default function AdminPreEstreiaMetaViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/pre-sale-games/${id}`)
      .then((r) => r.json())
      .then((g) => {
        if (g?.id && g?.metaEnabled) setGame(g);
        else setGame(null);
      })
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">
        Carregando...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">
        Jogo não encontrado ou não é um jogo Meta.
        <Link href="/admin/pre-estreia-meta" className="ml-2 text-futvar-green hover:underline">Voltar à lista</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/admin/pre-estreia-meta" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">← Voltar</Link>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{game.title}</h1>
        <Link
          href={`/admin/pre-estreia-meta/${id}/editar`}
          className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
        >
          Editar
        </Link>
      </div>

      <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-netflix-gray mb-6">
        <Image src={game.thumbnailUrl} alt="" fill className="object-cover" unoptimized={game.thumbnailUrl?.startsWith('http')} />
      </div>

      <div className="bg-netflix-dark border border-white/10 rounded-lg p-6 space-y-4">
        <p className="text-netflix-light text-sm">
          Status: <span className="text-white font-medium">{game.status}</span>
        </p>
        {game.specialCategory && (
          <p className="text-netflix-light text-sm">Categoria: {game.specialCategory.name}</p>
        )}
        {game.metaExtraPerTeam != null && (
          <p className="text-netflix-light text-sm">Meta extra por time: +{game.metaExtraPerTeam} assinantes</p>
        )}
        {game.homeTeam && game.awayTeam && (
          <p className="text-netflix-light text-sm">
            Times: {game.homeTeam.name} x {game.awayTeam.name}
          </p>
        )}
        {game.baselineHomeSubs != null && game.baselineAwaySubs != null && (
          <p className="text-netflix-light text-sm">
            Baseline na criação: Mandante {game.baselineHomeSubs} assinantes • Visitante {game.baselineAwaySubs} assinantes
          </p>
        )}
        {game.metaHomeTotal != null && game.metaAwayTotal != null && (
          <p className="text-netflix-light text-sm">
            Meta total: Mandante {game.metaHomeTotal} • Visitante {game.metaAwayTotal}
          </p>
        )}
        {game.videoUrl && <p className="text-green-400 text-sm">Vídeo URL preenchida</p>}
      </div>

      {game.description && (
        <div className="mt-6 bg-netflix-dark border border-white/10 rounded-lg p-6">
          <h2 className="text-sm font-medium text-white mb-2">Descrição</h2>
          <p className="text-netflix-light text-sm whitespace-pre-wrap">{game.description}</p>
        </div>
      )}
    </div>
  );
}
