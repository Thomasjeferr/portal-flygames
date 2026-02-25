'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  type: string;
  periodicity: string;
  price: number;
  description: string | null;
  active: boolean;
  acessoTotal: boolean;
  duracaoDias: number | null;
  renovacaoAuto: boolean;
  featured?: boolean;
}

const typeLabel: Record<string, string> = {
  unitario: 'Unitário',
  recorrente: 'Recorrente',
};
const periodLabel: Record<string, string> = {
  mensal: 'Mensal',
  anual: 'Anual',
  personalizado: 'Personalizado',
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPlans = async () => {
    const res = await fetch('/api/admin/plans');
    if (res.ok) {
      const data = await res.json();
      setPlans(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleActive = async (plan: Plan) => {
    setToggling(plan.id);
    try {
      await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !plan.active }),
      });
      fetchPlans();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o plano "${name}"? Só é possível se não houver compras/assinaturas.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPlans();
      else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Planos</h1>
        <Link href="/admin/planos/novo" className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600">
          Novo plano
        </Link>
      </div>
      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : plans.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          Nenhum plano cadastrado. <Link href="/admin/planos/novo" className="text-netflix-red hover:underline">Criar o primeiro</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-wrap items-center gap-4 bg-netflix-dark border rounded-lg p-4 ${plan.active ? 'border-white/10' : 'border-white/5 opacity-75'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white">{plan.name}</p>
                  {!plan.active && <span className="px-2 py-0.5 rounded text-xs bg-netflix-gray text-netflix-light">Inativo</span>}
                  <span className="text-netflix-light text-sm">
                    {typeLabel[plan.type] ?? plan.type} • {periodLabel[plan.periodicity] ?? plan.periodicity}
                  </span>
                  {plan.featured && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 uppercase tracking-wide">
                      Mais relevante
                    </span>
                  )}
                </div>
                <p className="text-sm text-netflix-light mt-1">
                  R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                  {plan.acessoTotal ? ' • Acesso total' : ' • Acesso parcial'}
                  {plan.duracaoDias != null && ` • ${plan.duracaoDias} dias`}
                  {plan.renovacaoAuto && ' • Renovação automática'}
                </p>
                {plan.description && <p className="text-xs text-netflix-light mt-1 line-clamp-1">{plan.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/plans/${plan.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ featured: !plan.featured }),
                    });
                    fetchPlans();
                  }}
                  className="px-3 py-1.5 rounded bg-amber-900/40 text-amber-200 text-sm hover:bg-amber-900/70"
                >
                  {plan.featured ? 'Remover destaque' : 'Marcar como mais relevante'}
                </button>
                <button type="button" onClick={() => handleToggleActive(plan)} disabled={toggling === plan.id} className={`px-3 py-1.5 rounded text-sm ${plan.active ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-900' : 'bg-green-900/50 text-green-300 hover:bg-green-900'} disabled:opacity-50`}>
                  {toggling === plan.id ? '...' : plan.active ? 'Desativar' : 'Ativar'}
                </button>
                <Link href={`/admin/planos/${plan.id}/editar`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">Editar</Link>
                <button type="button" onClick={() => handleDelete(plan.id, plan.name)} disabled={deleting === plan.id} className="px-3 py-1.5 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50">
                  {deleting === plan.id ? '...' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
