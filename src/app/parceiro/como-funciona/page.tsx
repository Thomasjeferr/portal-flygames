'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Partner = {
  planCommissionPercent: number;
  gameCommissionPercent: number;
  sponsorCommissionPercent: number;
};

export default function ParceiroComoFuncionaPage() {
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    fetch('/api/partner/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPartner(data ?? null));
  }, []);

  const steps = [
    {
      title: 'Compartilhe seu link',
      description: 'Use o link que está em Meu link (com seu código) e envie por WhatsApp, redes sociais, e-mail ou onde sua audiência estiver.',
    },
    {
      title: 'O cliente acessa e compra',
      description: 'Quando a pessoa clicar no seu link, escolher um plano ou patrocínio e concluir o pagamento (Pix ou cartão), a venda fica vinculada a você.',
    },
    {
      title: 'Pagamento confirmado',
      description: 'Assim que o pagamento for aprovado, sua comissão é registrada. Você vê a indicação em Indicações e o valor em Comissões.',
    },
    {
      title: 'Receba sua comissão',
      description: 'Quando houver comissões liberadas, você pode solicitar o saque (Pix) na aba Comissões. O time Fly Games processa e você recebe.',
    },
  ];

  return (
    <div>
      {/* Título e subtítulo como no mockup */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Como funciona o programa de parceiros
        </h1>
        <p className="text-white/90 mt-2 text-base max-w-2xl">
          Entenda o ciclo de indicação e como você ganha comissões por cada venda realizada.
        </p>
      </div>

      {/* Passo a passo - cards escuros com círculo verde numerado */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Passo a passo</h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#2D3748] border border-white/5 p-4 flex gap-4 items-start"
            >
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#34D399] text-white font-bold flex items-center justify-center text-sm">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-white/70 mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Em que você ganha - card no mesmo estilo */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Em que você ganha</h2>
        <div className="rounded-xl bg-[#2D3748] border border-white/5 p-4">
          {partner ? (
            <ul className="space-y-2 text-white/90">
              <li>
                <strong className="text-white">Planos e assinaturas:</strong>{' '}
                {partner.planCommissionPercent}%
              </li>
              <li>
                <strong className="text-white">Jogos avulsos:</strong>{' '}
                {partner.gameCommissionPercent}%
              </li>
              <li>
                <strong className="text-white">Patrocínio:</strong>{' '}
                {partner.sponsorCommissionPercent}%
              </li>
            </ul>
          ) : (
            <p className="text-white/70">Carregando seus percentuais...</p>
          )}
          <p className="text-sm text-white/60 mt-3">
            Se um plano ou patrocínio tiver percentual próprio definido pelo portal, aquele valor é usado naquela venda.
          </p>
        </div>
      </section>

      {/* Box Dica - borda verde e tag "Dica" como no mockup */}
      <section className="mb-8">
        <div className="rounded-xl border-2 border-[#34D399] bg-[#2D3748]/50 p-4">
          <span className="inline-block px-2.5 py-1 rounded bg-[#34D399] text-white text-xs font-semibold mb-3">
            Dica
          </span>
          <p className="text-sm text-white/90 leading-relaxed">
            Peça para o cliente usar sempre o seu link (com seu código na URL). Assim a indicação fica garantida. Se a pessoa abrir o site por outro link e comprar, não será possível atribuir a venda a você.
          </p>
          <Link
            href="/parceiro/link"
            className="inline-block mt-3 text-sm font-medium text-[#34D399] hover:text-[#6EE7B7]"
          >
            Copiar meu link →
          </Link>
        </div>
      </section>

      {/* Como receber - mantido, mesmo estilo de card */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Como receber o dinheiro</h2>
        <div className="rounded-xl bg-[#2D3748] border border-white/5 p-4 text-white/80 text-sm space-y-2">
          <p>1. Suas comissões aparecem em <Link href="/parceiro/comissoes" className="text-[#34D399] hover:underline">Comissões</Link> com status &quot;pendente&quot; ou &quot;liberado&quot;.</p>
          <p>2. Quando houver valor liberado, use o botão de solicitar saque (Pix). Informe sua chave PIX e o valor será processado pelo time Fly Games.</p>
          <p>3. O prazo de pagamento depende da análise e do processamento; em caso de dúvida, entre em contato pelo canal de suporte.</p>
        </div>
      </section>

      {/* FAQ - cards discretos */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Perguntas frequentes</h2>
        <dl className="space-y-3 text-sm">
          <div className="rounded-lg bg-[#2D3748] border border-white/5 p-3">
            <dt className="font-medium text-white">Quando a indicação é contada?</dt>
            <dd className="text-white/70 mt-1">No momento em que o cliente clica em &quot;Pagar&quot; no checkout usando seu link (ou tendo acessado por ele na mesma sessão). Depois que a compra é feita com seu código, a comissão é gerada quando o pagamento é aprovado.</dd>
          </div>
          <div className="rounded-lg bg-[#2D3748] border border-white/5 p-3">
            <dt className="font-medium text-white">O cliente não usou meu link. E agora?</dt>
            <dd className="text-white/70 mt-1">Infelizmente não é possível atribuir vendas em que o cliente entrou no site por outro caminho. Por isso é importante divulgar sempre o link completo (Meu link).</dd>
          </div>
          <div className="rounded-lg bg-[#2D3748] border border-white/5 p-3">
            <dt className="font-medium text-white">Onde vejo minhas indicações e comissões?</dt>
            <dd className="text-white/70 mt-1">Em <Link href="/parceiro/indicacoes" className="text-[#34D399] hover:underline">Indicações</Link> você vê quem comprou pelo seu link. Em <Link href="/parceiro/comissoes" className="text-[#34D399] hover:underline">Comissões</Link> você vê os valores, status e pode solicitar saque.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
