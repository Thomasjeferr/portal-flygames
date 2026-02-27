import Link from 'next/link';

export function TorneiosListEmpty({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="px-4 lg:px-12 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-futvar-green/20 border-dashed bg-futvar-dark/60 p-12 sm:p-16 text-center">
          <div className="text-6xl sm:text-7xl mb-6" aria-hidden>🏆</div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Nenhum campeonato ativo no momento
          </h2>
          <p className="text-futvar-light mb-8 max-w-md mx-auto">
            Os campeonatos publicados aparecerão aqui. Acompanhe a página ou crie um novo campeonato pelo painel administrativo.
          </p>
          {isAdmin ? (
            <Link
              href="/admin/torneios/novo"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Criar Campeonato
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-futvar-green/50 text-futvar-green font-bold hover:bg-futvar-green/10 transition-colors"
            >
              Voltar ao início
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
