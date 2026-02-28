'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  maxConcurrentStreams?: number | null;
  teamPayoutPercent?: number | null;
   featured?: boolean;
}

const typeLabel: Record<string, string> = {
  unitario: 'Jogo avulso',
  recorrente: 'Recorrente',
};
const periodLabel: Record<string, string> = {
  mensal: 'Mensal',
  anual: 'Anual',
  personalizado: 'Personalizado',
};

export default function PlanosPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeamManager, setIsTeamManager] = useState(false);

  // Persiste ref do parceiro na sessão para não perder a indicação se a URL do checkout não tiver ref
  useEffect(() => {
    if (ref && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('portal_futvar_partner_ref', ref);
      } catch {
        // ignorar se sessionStorage não disponível
      }
    }
  }, [ref]);

  useEffect(() => {
    Promise.all([
      fetch('/api/plans', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([plansData, authData]) => {
        setPlans(Array.isArray(plansData) ? plansData : []);
        setIsTeamManager(!!authData?.isTeamManager);
      })
      .finally(() => setLoading(false));
  }, []);

  const featuredPlan = plans.find((p) => p.featured);
  const recommendedPlanId =
    plans.length > 0
      ? featuredPlan?.id ??
        plans.find((p) => p.type === 'recorrente' && p.periodicity === 'mensal')?.id ??
        plans[0].id
      : null;

  // Coloca o plano "Mais escolhido" no meio dos cards; os outros à esquerda e à direita
  const displayPlans =
    plans.length > 0 && recommendedPlanId
      ? (() => {
          const recommended = plans.find((p) => p.id === recommendedPlanId);
          const others = plans.filter((p) => p.id !== recommendedPlanId);
          const centerIndex = Math.floor(plans.length / 2);
          const leftCount = centerIndex;
          if (!recommended) return plans;
          return [
            ...others.slice(0, leftCount),
            recommended,
            ...others.slice(leftCount),
          ];
        })()
      : plans;

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-5xl mx-auto">
        {isTeamManager && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-center">
            <p className="font-medium">Esta conta é de responsável pelo time e não pode realizar compras.</p>
            <p className="text-sm mt-1 text-amber-200/90">
              Para assinar ou comprar jogos, saia e crie uma conta de cliente em <Link href="/cadastro" className="underline font-semibold">Cadastro</Link>.
            </p>
          </div>
        )}
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Escolha como assistir aos seus jogos
          </h1>
          <p className="text-futvar-light text-lg max-w-2xl mx-auto">
            Veja o futebol de várzea com filmagem em drone, replays e acesso fácil pelo celular, TV ou computador.
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
            {displayPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-gradient-to-b from-futvar-dark to-black/70 border rounded-2xl p-6 flex flex-col transition-all ${
                  plan.id === recommendedPlanId
                    ? 'border-futvar-green shadow-[0_0_35px_rgba(34,197,94,0.35)] scale-[1.02]'
                    : 'border-futvar-green/20 hover:border-futvar-green/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-futvar-green/20 text-futvar-green">
                      {typeLabel[plan.type] ?? plan.type}
                    </span>
                  {plan.type === 'recorrente' && (
                    <span className="text-futvar-light text-xs tracking-wide">
                      {periodLabel[plan.periodicity] ?? plan.periodicity}
                    </span>
                  )}
                  </div>
                  {plan.id === recommendedPlanId && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-futvar-green text-futvar-darker tracking-wide">
                      Mais escolhido
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                <p className="text-2xl font-bold text-futvar-green mb-1">
                  R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                  {plan.type === 'recorrente' && plan.periodicity === 'mensal' && (
                    <span className="text-sm font-normal text-futvar-light">/mês</span>
                  )}
                  {plan.type === 'recorrente' && plan.periodicity === 'anual' && (
                    <span className="text-sm font-normal text-futvar-light">/ano</span>
                  )}
                </p>
                {(plan.teamPayoutPercent ?? 0) > 0 && (
                  <p className="text-futvar-green/90 text-sm font-medium mb-2">
                    {(plan.teamPayoutPercent ?? 0)}% do valor repassado ao clube
                  </p>
                )}
                <p className="text-xs text-futvar-light mb-4">
                  {plan.type === 'unitario'
                    ? 'Ideal para testar o portal em um jogo específico.'
                    : 'Para acompanhar todos os jogos do seu time com replays aéreos.'}
                </p>
                {plan.description && (
                  <p className="text-futvar-light text-sm mb-4 flex-1">{plan.description}</p>
                )}
                <ul className="text-sm text-futvar-light space-y-2 mb-6">
                  {plan.acessoTotal && <li>✓ Acesso a todo o catálogo</li>}
                  {plan.duracaoDias != null && <li>✓ Acesso por {plan.duracaoDias} dias</li>}
                  {plan.duracaoDias == null && plan.type === 'unitario' && <li>✓ Acesso ilimitado ao jogo</li>}
                  {plan.renovacaoAuto && <li>✓ Renovação automática</li>}
                  {typeof plan.maxConcurrentStreams === 'number' && plan.maxConcurrentStreams > 0 && (
                    <li>✓ Até {plan.maxConcurrentStreams} tela{plan.maxConcurrentStreams > 1 ? 's' : ''} simultânea{plan.maxConcurrentStreams > 1 ? 's' : ''}</li>
                  )}
                </ul>
                <div className="mt-auto">
                  <Link
                    href={`/checkout?planId=${plan.id}${plan.type === 'unitario' ? '&gameId=' : ''}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`}
                    className={`block w-full py-3 rounded-lg font-bold text-center transition-colors ${
                      plan.id === recommendedPlanId
                        ? 'bg-futvar-green text-futvar-darker hover:bg-futvar-green-light'
                        : 'border-2 border-futvar-green/60 text-futvar-green bg-transparent hover:bg-futvar-green/10'
                    }`}
                  >
                    {plan.type === 'unitario' ? 'Comprar este jogo' : 'Patrocinar'}
                  </Link>
                </div>
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
