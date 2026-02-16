'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Live {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  cloudflareLiveInputId: string | null;
  status: string;
  startAt: string | null;
  endAt: string | null;
  requireSubscription: boolean;
  allowOneTimePurchase: boolean;
  allowChat: boolean;
  createdAt: string;
}

export default function AdminLivesPage() {
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLives = async () => {
    const res = await fetch('/api/admin/lives');
    if (res.ok) {
      const data = await res.json();
      setLives(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLives();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir a live "${title}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/lives/${id}`, { method: 'DELETE' });
      if (res.ok) fetchLives();
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const statusLabel: Record<string, string> = {
    SCHEDULED: 'Agendada',
    LIVE: 'Ao vivo',
    ENDED: 'Encerrada',
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">Lives</h1>
        <Link
          href="/admin/lives/novo"
          className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
        >
          Criar Live
        </Link>
      </div>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : lives.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          Nenhuma live cadastrada.{' '}
          <Link href="/admin/lives/novo" className="text-netflix-red hover:underline">
            Criar a primeira
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lives.map((live) => (
            <div
              key={live.id}
              className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
            >
              <div className="relative w-24 h-14 rounded overflow-hidden bg-netflix-gray flex-shrink-0">
                {live.thumbnailUrl ? (
                  <Image
                    src={live.thumbnailUrl.startsWith('http') ? live.thumbnailUrl : live.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl text-netflix-light">
                    ●
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{live.title}</p>
                <p className="text-sm text-netflix-light">
                  {formatDate(live.startAt)} •{' '}
                  <span
                    className={
                      live.status === 'LIVE'
                        ? 'text-green-400'
                        : live.status === 'ENDED'
                          ? 'text-netflix-light'
                          : 'text-yellow-400'
                    }
                  >
                    {statusLabel[live.status] ?? live.status}
                  </span>
                  {live.cloudflareLiveInputId ? (
                    <span className="ml-2 px-2 py-0.5 rounded bg-white/10 text-xs">OBS configurado</span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 text-xs">
                      Sem credenciais OBS
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/lives/${live.id}/editar`}
                  className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                >
                  Editar
                </Link>
                <a
                  href={`/live/${live.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                >
                  Ver página
                </a>
                <button
                  onClick={() => handleDelete(live.id, live.title)}
                  disabled={deleting === live.id}
                  className="px-3 py-1.5 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50"
                >
                  {deleting === live.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
