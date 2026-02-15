import Link from 'next/link';

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Termos de uso</h1>
        <p className="text-futvar-light text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Aceitação</h2>
            <p>
              Ao utilizar a plataforma Fly Games, você concorda com estes termos de uso. Se não concordar,
              não utilize nossos serviços.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Serviços</h2>
            <p>
              A Fly Games oferece transmissão de jogos de futebol de várzea filmados com drones, planos de
              assinatura e conteúdo sob demanda conforme disponibilizado na plataforma.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">3. Uso adequado</h2>
            <p>
              O usuário compromete-se a utilizar a plataforma de forma legal e ética, sem compartilhar
              credenciais, distribuir conteúdo não autorizado ou violar direitos de terceiros.
            </p>
          </section>
        </div>
        <p className="mt-10 text-futvar-light text-sm">
          <Link href="/" className="text-futvar-green hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
