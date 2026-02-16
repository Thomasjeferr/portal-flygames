'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SponsorPlan = {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  benefits: string[];
  featuresFlags: Record<string, boolean>;
  sortOrder: number;
  isActive: boolean;
};

const BILLING_LABEL: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

export default function AdminSponsorPlansPage() {
  const [plans, setPlans] = useState<SponsorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    fetch('/api/admin/sponsor-plans')
      .then((r) => r.json())
      .then((d) => setPlans(Array.isArray(d) ? d : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleToggle = async (plan: SponsorPlan) => {
    setToggling(plan.id);
    try {
      const res = await fetch(`/api/admin/sponsor-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (res.ok) load();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o plano "${name}"? Patrocinadores vinculados ficarão sem plano.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/sponsor-plans/${id}`, { method: 'DELETE' });
      if (res.ok) load();
      else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/sponsors" className="text-netflix-light hover:text-white text-sm mb-2 inline-block">
            ← Patrocinadores
          </Link>
          <h1 className="text-2xl font-bold text-white">Planos de Patrocínio</h1>
        </div>
        <Link
          href="/admin/sponsors/planos/novo"
          className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
        >
          Criar plano
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-netflix-dark p-12 text-center">
          <p className="text-netflix-light mb-4">Nenhum plano de patrocínio cadastrado.</p>
          <Link href="/admin/sponsors/planos/novo" className="text-netflix-red hover:underline">
            Criar primeiro plano
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-netflix-light text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Ordem</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-netflix-light">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 text-netflix-light">{BILLING_LABEL[p.billingPeriod] ?? p.billingPeriod}</td>
                  <td className="px-4 py-3 text-netflix-light">{p.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={p.isActive ? 'text-futvar-green' : 'text-netflix-light'}>
                      {p.isActive ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/sponsors/planos/${p.id}/editar`}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={toggling === p.id}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20 disabled:opacity-50"
                      >
                        {toggling === p.id ? '...' : p.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deleting === p.id}
                        className="px-3 py-1.5 rounded bg-red-900/30 text-red-400 text-sm hover:bg-red-900/50 disabled:opacity-50"
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
