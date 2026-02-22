'use client';

import { useEffect, useState } from 'react';

type Partner = {
  id: string;
  name: string;
  refCode: string;
  planCommissionPercent: number;
  gameCommissionPercent: number;
  sponsorCommissionPercent: number;
};

export default function ParceiroLinkPage() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partner/me')
      .then((r) => r.ok ? r.json() : null)
      .then(setPartner);
  }, []);

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://flygames.app';

  const linkPlanos = `${baseUrl}/planos?ref=${partner?.refCode ?? ''}`;
  const linkPatrocinar = `${baseUrl}/patrocinar?ref=${partner?.refCode ?? ''}`;

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!partner) {
    return (
      <div>
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Meu link de parceiro</h1>
        <p className="text-futvar-light mt-1">
          Compartilhe estes links. Quando alguém assinar ou patrocinar por eles, sua comissão será registrada.
        </p>
      </div>

      <div className="rounded-xl bg-futvar-dark border border-white/10 p-4 mb-6">
        <p className="text-sm text-futvar-light mb-1">Seu código</p>
        <p className="text-xl font-mono font-bold text-futvar-green">{partner.refCode}</p>
        <button
          type="button"
          onClick={() => copy(partner.refCode, 'code')}
          className="mt-2 text-sm text-futvar-green hover:text-futvar-green-light"
        >
          {copied === 'code' ? 'Copiado!' : 'Copiar código'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl bg-futvar-dark border border-white/10 p-4">
          <p className="text-sm font-medium text-white mb-1">Link para planos e assinaturas</p>
          <p className="text-sm text-futvar-light break-all mb-2">{linkPlanos}</p>
          <button
            type="button"
            onClick={() => copy(linkPlanos, 'planos')}
            className="px-3 py-1.5 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light"
          >
            {copied === 'planos' ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
        <div className="rounded-xl bg-futvar-dark border border-white/10 p-4">
          <p className="text-sm font-medium text-white mb-1">Link para patrocínio</p>
          <p className="text-sm text-futvar-light break-all mb-2">{linkPatrocinar}</p>
          <button
            type="button"
            onClick={() => copy(linkPatrocinar, 'patrocinar')}
            className="px-3 py-1.5 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light"
          >
            {copied === 'patrocinar' ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-futvar-light">
        <p className="font-medium text-white mb-1">Seus percentuais</p>
        <p>Planos e assinaturas: {partner.planCommissionPercent}% · Jogos avulsos: {partner.gameCommissionPercent}% · Patrocínio: {partner.sponsorCommissionPercent}%</p>
        <p className="mt-2 text-futvar-light/90">Quando um plano ou patrocínio tiver percentual próprio definido, aquele valor é usado naquela venda. Você recebe o valor líquido da comissão. Acompanhe em Comissões.</p>
      </div>
    </div>
  );
}
