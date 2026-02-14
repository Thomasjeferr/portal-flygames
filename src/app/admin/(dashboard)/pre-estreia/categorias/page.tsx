'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PreSaleCategory {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export default function AdminPreEstreiaCategoriasPage() {
  const [special, setSpecial] = useState<PreSaleCategory[]>([]);
  const [normal, setNormal] = useState<PreSaleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'SPECIAL' | 'NORMAL'>('SPECIAL');
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = () => {
    Promise.all([
      fetch('/api/admin/pre-sale-categories?type=SPECIAL'),
      fetch('/api/admin/pre-sale-categories?type=NORMAL'),
    ])
      .then(async ([resSpecial, resNormal]) => {
        const s = await resSpecial.json();
        const n = await resNormal.json();
        setSpecial(resSpecial.ok && Array.isArray(s) ? s : []);
        setNormal(resNormal.ok && Array.isArray(n) ? n : []);
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/pre-sale-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar');
        return;
      }
      setNewName('');
      loadCategories();
    } catch {
      setError('Erro de conexao');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/admin/pre-estreia" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">
        Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Categorias pre-estreia</h1>
      <p className="text-netflix-light text-sm mb-8">
        Crie categorias SPECIAL (para jogos em pre-venda) e NORMAL (para o catalogo publico apos publicacao).
      </p>

      <form onSubmit={handleCreate} className="bg-netflix-dark border border-white/10 rounded-lg p-6 mb-8">
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-white mb-2">Nome</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Libertadores, Brasileirao"
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder:text-netflix-light"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-white mb-2">Tipo</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'SPECIAL' | 'NORMAL')}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white"
            >
              <option value="SPECIAL">SPECIAL</option>
              <option value="NORMAL">NORMAL</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-netflix-dark border border-white/10 rounded-lg p-4">
            <h2 className="font-semibold text-white mb-3">Categorias SPECIAL</h2>
            {special.length === 0 ? (
              <p className="text-netflix-light text-sm">Nenhuma. Crie acima.</p>
            ) : (
              <ul className="space-y-2">
                {special.map((c) => (
                  <li key={c.id} className="text-white text-sm flex items-center gap-2">
                    <span className="text-futvar-green">●</span> {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-netflix-dark border border-white/10 rounded-lg p-4">
            <h2 className="font-semibold text-white mb-3">Categorias NORMAL</h2>
            {normal.length === 0 ? (
              <p className="text-netflix-light text-sm">Nenhuma. Crie acima.</p>
            ) : (
              <ul className="space-y-2">
                {normal.map((c) => (
                  <li key={c.id} className="text-white text-sm flex items-center gap-2">
                    <span className="text-futvar-gold">●</span> {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Link
        href="/admin/pre-estreia/novo"
        className="mt-8 inline-block text-futvar-green hover:underline text-sm"
      >
        Ir para Novo jogo
      </Link>
    </div>
  );
}
