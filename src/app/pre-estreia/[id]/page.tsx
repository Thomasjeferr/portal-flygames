'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

type GameInfo = {
  id: string;
  slug?: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  fundedClubsCount?: number;
};

type Access = {
  loggedIn: boolean;
  canAccessCheckout: boolean;
  slotAlreadyPaid?: boolean;
  clubViewerHasAccess?: boolean;
  gameSlug?: string;
};

export default function PreEstreiaClubesLandingPage() {
  const params = useParams();
  const router = useRouter();
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
        // Usuário/senha da pré-estreia (club_viewer) com acesso a este jogo → vai direto para o player
        if (a?.clubViewerHasAccess && a?.gameSlug) {
          router.replace(`/pre-estreia/assistir/${a.gameSlug}`);
        }
      })
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id, router]);

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
  const fullyFunded = funded >= 2;
  const assistirUrl = `/pre-estreia/assistir/${game.slug || game.id}`;

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
        <p className="text-futvar-light text-sm mb-4">{game.description}</p>

        {/* Status de financiamento */}
        {fullyFunded && (
          <p className="text-futvar-green font-semibold text-sm mb-6">
            Patrocínio OK — Financiados: 2/2. Em breve disponível para membros dos clubes e assinantes.
          </p>
        )}
        {!fullyFunded && (
          <p className="text-amber-200/90 text-sm mb-6">
            Financiamento: <strong>{funded}/2</strong> clubes. Quando os dois pagarem, a pré-estreia segue o fluxo combinado.
          </p>
        )}

        {/* Quando já financiado: priorizar "como assistir" */}
        {fullyFunded && (
          <div className="p-6 rounded-xl bg-futvar-green/10 border border-futvar-green/40 mb-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Como assistir</h2>
            <p className="text-futvar-light text-sm">
              Os dois clubes já financiaram este jogo. Para assistir:
            </p>
            <ul className="text-futvar-light text-sm space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Membros do clube:</strong> use o usuário e senha enviados ao responsável do seu time por e-mail.
              </li>
              <li>
                <strong className="text-white">Assinantes:</strong> o jogo estará disponível na grade quando a transmissão for liberada.
              </li>
            </ul>
            <Link
              href={assistirUrl}
              className="inline-block w-full text-center py-3 px-6 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light"
            >
              Ir para assistir
            </Link>
          </div>
        )}

        {/* Bloco explicativo */}
        <div className="p-6 rounded-xl bg-futvar-dark/60 border border-futvar-green/25 mb-6 space-y-4 text-sm text-futvar-light">
          <h2 className="text-lg font-bold text-white">Pré-estreia clubes — como funciona</h2>
          <p>
            Esta transmissão é <strong className="text-white">adquirida por clubes já cadastrados</strong> e
            aprovados no portal. O <strong className="text-white">responsável de cada time</strong> paga o próprio
            slot com a conta da Área do time. Não é compra para torcedores ou conta comum.
          </p>
          {!fullyFunded && (
            <p className="text-amber-200/90">
              Financiamento: <strong>{funded}/2</strong> clubes. Quando os dois pagarem, a pré-estreia segue o fluxo
              combinado com a plataforma.
            </p>
          )}
        </div>

        {/* Não logado */}
        {!access?.loggedIn && (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-6">
            {fullyFunded ? (
              <>
                <p className="text-futvar-light text-sm mb-4">
                  Na página de assistir você pode usar o <strong className="text-white">usuário e senha</strong> que
                  foram enviados ao responsável do seu clube por e-mail.
                </p>
                <Link
                  href={assistirUrl}
                  className="inline-block w-full text-center py-3 px-6 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light mb-4"
                >
                  Ir para assistir
                </Link>
                <p className="text-futvar-light text-xs">
                  Sou responsável de um dos times e preciso acessar a área do time ou concluir pagamento?{' '}
                  <Link href={`/entrar?redirect=${encodeURIComponent(returnAfterLogin)}`} className="text-futvar-green hover:underline">
                    Entrar com conta do responsável
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold mb-3">Você é responsável por um dos times deste jogo?</p>
                <p className="text-futvar-light text-sm mb-6">
                  Faça login com o <strong className="text-white">e-mail da conta do time</strong>. Depois você
                  preenche os dados e gera o Pix do slot do seu time (mandante ou visitante).
                </p>
                <Link
                  href={`/entrar?redirect=${encodeURIComponent(returnAfterLogin)}`}
                  className="inline-block w-full text-center py-3 px-6 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light"
                >
                  Entrar com conta do responsável
                </Link>
                <p className="text-futvar-light text-xs mt-4">
                  Se você não é responsável por nenhum dos dois times, o acesso ao jogo ocorre pela grade quando o
                  conteúdo estiver disponível para assinantes.
                </p>
              </>
            )}
          </div>
        )}

        {/* Logado mas não é responsável (conta comum ou outra) */}
        {access?.loggedIn && !access.canAccessCheckout && (
          <div className={`p-6 rounded-xl border mb-6 ${fullyFunded ? 'bg-white/5 border-white/10' : 'bg-amber-500/10 border-amber-500/30'}`}>
            {fullyFunded ? (
              <>
                <p className="text-white font-semibold mb-2">Como assistir este jogo</p>
                <p className="text-futvar-light text-sm mb-4">
                  Use o <strong className="text-white">usuário e senha de clube</strong> enviados ao responsável do
                  seu time por e-mail, ou aguarde a disponibilidade para assinantes na grade. Esta conta não é de
                  responsável por um dos times.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={assistirUrl}
                    className="inline-block text-center py-2 px-4 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light text-sm"
                  >
                    Ir para assistir
                  </Link>
                  <Link href="/" className="inline-block text-center py-2 px-4 rounded-lg border border-white/30 text-futvar-light hover:text-white text-sm">
                    Ir ao início
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-amber-100 font-semibold mb-2">Sua conta não é de responsável por estes times</p>
                <p className="text-futvar-light text-sm mb-4">
                  A pré-estreia é paga pelos responsáveis do time mandante e visitante. Com o login atual você não
                  tem permissão para comprar um slot.
                </p>
                <p className="text-futvar-light text-sm mb-4">
                  Se você é responsável, entre com a conta da Área do time. Se é torcedor ou assinante, acompanhe
                  quando a pré-estreia estiver liberada na grade.
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
              </>
            )}
          </div>
        )}

        {/* Responsável cujo time JÁ pagou este jogo */}
        {access?.loggedIn && access.canAccessCheckout && access.slotAlreadyPaid && (
          <div className="p-6 rounded-xl bg-futvar-green/10 border border-futvar-green/40 mb-6">
            <p className="text-white font-semibold mb-2">Seu time já pagou esta pré-estreia</p>
            <p className="text-futvar-light text-sm mb-4">
              Identificamos que o slot do <strong className="text-white">seu time</strong> neste jogo já foi quitado.
              Não é necessário realizar outro pagamento.
            </p>
            <p className="text-futvar-light text-sm mb-4">
              As credenciais de acesso foram enviadas para o e-mail do responsável após o pagamento. Use-as para
              compartilhar o acesso com os membros do time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/conta"
                className="inline-block text-center py-2 px-4 rounded-lg bg-futvar-green text-futvar-darker hover:bg-futvar-green-light text-sm font-semibold"
              >
                Ir para minha conta
              </Link>
              <Link
                href={`/pre-estreia/assistir/${game.slug || game.id}`}
                className="inline-block text-center py-2 px-4 rounded-lg bg-futvar-dark text-futvar-light hover:text-white border border-futvar-green/40 text-sm font-semibold"
              >
                Ver área de assistir
              </Link>
            </div>
          </div>
        )}

        {/* Responsável — checkout direto (slot pelo login) */}
        {access?.loggedIn && access.canAccessCheckout && !access.slotAlreadyPaid && (
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
