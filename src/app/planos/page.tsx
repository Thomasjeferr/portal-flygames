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
  acessoTotal: boolean;
  duracaoDias: number | null;
  renovacaoAuto: boolean;
}

const typeLabel: Record<string, string> = {
  unitario: 'Jogo avulso',
  recorrente: 'Assinatura',
};
const periodLabel: Record<string, string> = {
  mensal: 'Mensal',
  anual: 'Anual',
  personalizado: 'Personalizado',
};

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Escolha seu plano
          </h1>
          <p className="text-futvar-light text-lg max-w-2xl mx-auto">
            Acesso a todos os jogos com filmagem em drone. Assinatura ou compre jogos avulsos.
          </p>
        </div>

        {loading ? (
          <p className="text-futvar-light text-center">Carregando planos...</p>
        ) : plans.length === 0 ? (
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-12 text-center text-futvar-light">
            Nenhum plano disponível no momento.
            <Link href="/" className="block mt-4 text-futvar-green hover:underline">Voltar ao início</Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6 flex flex-col hover:border-futvar-green/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-futvar-green/20 text-futvar-green">
                    {typeLabel[plan.type] ?? plan.type}
                  </span>
                  <span className="text-futvar-light text-sm">{periodLabel[plan.periodicity] ?? plan.periodicity}</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{plan.name}</h2>
                <p className="text-2xl font-bold text-futvar-green mb-4">
                  R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                  {plan.periodicity === 'mensal' && <span className="text-sm font-normal text-futvar-light">/mês</span>}
                  {plan.periodicity === 'anual' && <span className="text-sm font-normal text-futvar-light">/ano</span>}
                </p>
                {plan.description && (
                  <p className="text-futvar-light text-sm mb-4 flex-1">{plan.description}</p>
                )}
                <ul className="text-sm text-futvar-light space-y-2 mb-6">
                  {plan.acessoTotal && <li>✓ Acesso a todo o catálogo</li>}
                  {plan.duracaoDias != null && <li>✓ Acesso por {plan.duracaoDias} dias</li>}
                  {plan.duracaoDias == null && plan.type === 'unitario' && <li>✓ Acesso ilimitado ao jogo</li>}
                  {plan.renovacaoAuto && <li>✓ Renovação automática</li>}
                </ul>
                <Link
                  href={`/checkout?planId=${plan.id}${plan.type === 'unitario' ? '&gameId=' : ''}`}
                  className="block w-full py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold text-center hover:bg-futvar-green-light transition-colors"
                >
                  Assinar / Comprar
                </Link>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-futvar-light text-sm mt-10">
          Já tem conta? <Link href="/entrar" className="text-futvar-green hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
