'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type GameInfo = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  fundedClubsCount?: number;
};

type Access = {
  loggedIn: boolean;
  canAccessCheckout: boolean;
};

export default function PreEstreiaClubesLandingPage() {
  const params = useParams();
  const id = params?.id as string;
  const [game, setGame] = useState<GameInfo | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/pre-sale/games/${id}`).then((r) => r.json()),
      fetch(`/api/pre-sale/games/${id}/responsible-access`, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : { loggedIn: false, canAccessCheckout: false }
      ),
    ])
      .then(([g, a]) => {
        setGame(g?.id ? g : null);
        setAccess(a);
      })
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="pt-24 px-4 text-center text-futvar-light min-h-[50vh]">
        Carregando...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="pt-24 px-4 text-center">
        <p className="text-futvar-light">Jogo não encontrado.</p>
        <Link href="/" className="text-futvar-green hover:underline mt-4 inline-block">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const returnAfterLogin = `/pre-estreia/${id}`;
  const funded = game.fundedClubsCount ?? 0;

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <Link href="/#pre-estreia" className="text-futvar-green hover:underline text-sm mb-6 inline-block">
          ← Voltar
        </Link>

        <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-futvar-gray">
          {game.thumbnailUrl && (
            <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{game.title}</h1>
        <p className="text-futvar-light text-sm mb-8">{game.description}</p>

        {/* Bloco explicativo sempre visível */}
        <div className="p-6 rounded-xl bg-futvar-dark/60 border border-futvar-green/25 mb-6 space-y-4 text-sm text-futvar-light">
          <h2 className="text-lg font-bold text-white">Pré-estreia clubes — como funciona</h2>
          <p>
            Esta transmissão é <strong className="text-white">adquirida por clubes já cadastrados</strong> e
            aprovados no portal. Os dois times (mandante e visitante) fecham com o administrador; o{' '}
            <strong className="text-white">responsável de cada time</strong> paga o próprio slot aqui com a conta
            da Área do time.
          </p>
          <p>
            <strong className="text-white">Não é compra para torcedores ou conta comum:</strong> quem paga é
            sempre o <strong className="text-white">responsável oficial do time</strong> — a mesma conta usada na{' '}
            <strong className="text-white">Área do time</strong> (painel do clube).
          </p>
          {funded < 2 && (
            <p className="text-amber-200/90">
              Financiamento: <strong>{funded}/2</strong> clubes. Quando os dois pagarem, a pré-estreia segue o fluxo
              combinado com a plataforma.
            </p>
          )}
        </div>

        {/* Não logado */}
        {!access?.loggedIn && (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-6">
            <p className="text-white font-semibold mb-3">Você é responsável por um dos times deste jogo?</p>
            <p className="text-futvar-light text-sm mb-6">
              Faça login com o <strong className="text-white">e-mail da conta do time</strong> (cadastro do clube
              no portal). Depois você preenche os dados e gera o Pix do slot do seu time (mandante ou visitante).
            </p>
            <Link
              href={`/entrar?redirect=${encodeURIComponent(returnAfterLogin)}`}
              className="inline-block w-full text-center py-3 px-6 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light"
            >
              Entrar com conta do responsável
            </Link>
            <p className="text-futvar-light text-xs mt-4">
              Se você <strong className="text-white">não</strong> é responsável por nenhum dos dois times, esta
              página não é para compra: o acesso ao jogo, para o público, ocorre pela grade quando o conteúdo
              estiver disponível para assinantes ou conforme regras do portal.
            </p>
          </div>
        )}

        {/* Logado mas não é responsável de mandante nem visitante */}
        {access?.loggedIn && !access.canAccessCheckout && (
          <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
            <p className="text-amber-100 font-semibold mb-2">Sua conta não é de responsável por estes times</p>
            <p className="text-futvar-light text-sm mb-4">
              A pré-estreia clubes é paga apenas pelos responsáveis do <strong className="text-white">time mandante</strong> e do{' '}
              <strong className="text-white">time visitante</strong> cadastrados neste jogo. Com o login atual você
              não tem permissão para comprar um slot.
            </p>
            <p className="text-futvar-light text-sm mb-4">
              Se outra pessoa é a responsável pelo time, ela precisa entrar com a conta dela. Se você é apenas
              torcedor ou assinante, acompanhe os jogos pela área habitual do site quando a pré-estreia estiver
              liberada na grade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/sair?redirect=${encodeURIComponent(returnAfterLogin)}`}
                className="inline-block text-center py-2 px-4 rounded-lg border border-futvar-green text-futvar-green hover:bg-futvar-green/10 text-sm"
              >
                Sair e entrar com outra conta
              </Link>
              <Link href="/" className="inline-block text-center py-2 px-4 rounded-lg bg-futvar-dark text-futvar-light hover:text-white text-sm">
                Ir ao início
              </Link>
            </div>
          </div>
        )}

        {/* Responsável — checkout direto (slot pelo login) */}
        {access?.loggedIn && access.canAccessCheckout && (
          <div className="p-6 rounded-xl bg-futvar-green/10 border border-futvar-green/40 mb-6">
            <p className="text-white font-semibold mb-2">Você pode concluir o pagamento do slot</p>
            <p className="text-futvar-light text-sm mb-6">
              Na próxima etapa o sistema já identifica o slot do <strong className="text-white">seu time</strong>{' '}
              (mandante ou visitante). Confira os dados pré-preenchidos e gere o Pix.
            </p>
            <Link
              href={`/pre-estreia/${id}/checkout`}
              className="inline-block w-full text-center py-3 px-6 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light"
            >
              Continuar para pagamento
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-futvar-light/70">
          Dúvidas? Entre em contato com o administrador da competição ou do portal.
        </p>
      </div>
    </div>
  );
}
