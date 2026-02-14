import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { VideoPlayer } from '@/components/VideoPlayer';
import { BuyGameButton } from '@/components/BuyGameButton';
import { getSession } from '@/lib/auth';
import { canAccessGameBySlug } from '@/lib/access';
import { prisma } from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game) notFound();

  const session = await getSession();
  const canWatch = session ? await canAccessGameBySlug(session.userId, slug) : false;

  const gameDateFormatted = new Date(game.gameDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2 transition-colors">
            ← Voltar ao início
          </Link>
        </div>

        {!canWatch ? (
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8 md:p-12 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{game.title}</h1>
            <p className="text-futvar-light mb-6">{game.championship} • {gameDateFormatted}</p>
            {game.thumbnailUrl && (
              <div className="relative aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden mb-8">
                <Image
                  src={game.thumbnailUrl.startsWith('http') ? game.thumbnailUrl : game.thumbnailUrl}
                  alt={game.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                    <p className="text-lg text-white mb-4">Assinatura ou compra necessária para assistir</p>
                    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
                      {session ? (
                        <Link
                          href="/planos"
                          className="inline-block px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
                        >
                          Ver planos e assinar
                        </Link>
                      ) : (
                        <Link
                          href="/entrar?redirect=/planos"
                          className="inline-block px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
                        >
                          Entrar ou cadastrar para assinar
                        </Link>
                      )}
                      <BuyGameButton gameId={game.id} className="inline-block px-6 py-4 border-2 border-futvar-gold/50 text-futvar-gold font-bold rounded-lg hover:bg-futvar-gold/10 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {game.description && (
              <p className="text-futvar-light text-left max-w-2xl mx-auto">{game.description}</p>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden bg-black mb-8 border border-futvar-green/20 shadow-xl">
              <VideoPlayer videoUrl={game.videoUrl} title={game.title} />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white">{game.title}</h1>
              <div className="flex flex-wrap gap-4 text-futvar-light">
                <span>{game.championship}</span>
                <span>•</span>
                <span>{gameDateFormatted}</span>
              </div>
              {game.description && (
                <p className="text-futvar-light leading-relaxed max-w-3xl">{game.description}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
