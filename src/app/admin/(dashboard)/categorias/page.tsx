'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCategories = async () => {
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleToggleActive = async (cat: Category) => {
    setToggling(cat.id);
    try {
      await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !cat.active }),
      });
      fetchCategories();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"? Os jogos vinculados ficarão sem categoria.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCategories();
      else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Categorias</h1>
        <Link href="/admin/categorias/novo" className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600">
          Nova categoria
        </Link>
      </div>
      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : categories.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          Nenhuma categoria. <Link href="/admin/categorias/novo" className="text-netflix-red hover:underline">Criar a primeira</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex flex-wrap items-center gap-4 bg-netflix-dark border rounded-lg p-4 ${cat.active ? 'border-white/10' : 'border-white/5 opacity-75'}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{cat.name}</p>
                <p className="text-sm text-netflix-light">{cat.slug} • Ordem: {cat.order}</p>
                {!cat.active && <span className="text-xs text-netflix-light">Inativa</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(cat)}
                  disabled={toggling === cat.id}
                  className={`px-3 py-1.5 rounded text-sm ${cat.active ? 'bg-amber-900/50 text-amber-300' : 'bg-green-900/50 text-green-300'} disabled:opacity-50`}
                >
                  {toggling === cat.id ? '...' : cat.active ? 'Desativar' : 'Ativar'}
                </button>
                <Link href={`/admin/categorias/${cat.id}/editar`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deleting === cat.id}
                  className="px-3 py-1.5 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50"
                >
                  {deleting === cat.id ? '...' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
