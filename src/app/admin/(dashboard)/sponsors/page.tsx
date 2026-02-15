'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Sponsor = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string;
  tier: string;
  priority: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
};

const TIER_LABEL: Record<string, string> = {
  MASTER: 'Master',
  OFICIAL: 'Oficial',
  APOIO: 'Apoio',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR');
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/admin/sponsors')
      .then((r) => r.json())
      .then((d) => setSponsors(Array.isArray(d) ? d : []))
      .catch(() => setSponsors([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/admin/sponsors/${id}/toggle`, { method: 'POST' });
    if (res.ok) load();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/admin/sponsors/${id}/duplicate`, { method: 'POST' });
    if (res.ok) load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir patrocinador "${name}"?`)) return;
    const res = await fetch(`/api/admin/sponsors/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Patrocinadores</h1>
        <Link
          href="/admin/sponsors/new"
          className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
        >
          Novo patrocinador
        </Link>
      </div>

      {sponsors.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-netflix-dark p-12 text-center">
          <p className="text-netflix-light mb-4">Nenhum patrocinador cadastrado.</p>
          <Link href="/admin/sponsors/new" className="text-netflix-red hover:underline">
            Cadastrar primeiro patrocinador
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-netflix-light text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sponsors.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-white/5">
                      <Image
                        src={s.logoUrl.startsWith('/') ? s.logoUrl : s.logoUrl}
                        alt={s.name}
                        fill
                        className="object-contain"
                        sizes="48px"
                        unoptimized={s.logoUrl.startsWith('http')}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        s.tier === 'MASTER'
                          ? 'bg-amber-500/20 text-amber-400'
                          : s.tier === 'OFICIAL'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/10 text-netflix-light'
                      }`}
                    >
                      {TIER_LABEL[s.tier] ?? s.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={s.isActive ? 'text-futvar-green' : 'text-netflix-light'}>
                      {s.isActive ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-netflix-light">{s.priority}</td>
                  <td className="px-4 py-3 text-netflix-light text-sm">
                    {fmtDate(s.startAt)} — {fmtDate(s.endAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/sponsors/${s.id}/editar`}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleToggle(s.id)}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                      >
                        {s.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDuplicate(s.id)}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                      >
                        Duplicar
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="px-3 py-1.5 rounded bg-red-900/30 text-red-400 text-sm hover:bg-red-900/50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
