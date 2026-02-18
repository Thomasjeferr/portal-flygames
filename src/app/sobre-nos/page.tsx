import Link from 'next/link';

export default function SobreNosPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Sobre o Fly Games</h1>
        <p className="text-futvar-light mb-8 leading-relaxed">
          O Fly Games nasceu de uma demanda simples e ignorada por muito tempo: assistir e registrar a várzea com
          qualidade, como ela merece. A gente viu clubes lotando campos, atletas se destacando e famílias querendo
          acompanhar — mas sem transmissão estável, sem replay organizado e sem uma vitrine real para patrocinadores.
        </p>
        <p className="text-futvar-light mb-10 leading-relaxed">
          Nosso objetivo é transformar cada jogo em conteúdo: ao vivo, replay e melhores momentos, com uma experiência
          moderna e acessível para torcedores, atletas e clubes.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">O que entregamos</h2>
          <ul className="space-y-2 text-futvar-light list-disc list-inside">
            <li>Transmissões e gravações com qualidade (incluindo drone quando aplicável)</li>
            <li>Jogos organizados por campeonato/categoria, com acesso por assinatura ou compra</li>
            <li>Estreias patrocinadas por clubes, com liberação para a equipe</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-2">Missão</h2>
          <p className="text-futvar-light leading-relaxed">
            Levar a várzea para mais gente, com qualidade, organização e monetização justa.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-2">Visão</h2>
          <p className="text-futvar-light leading-relaxed">
            Ser a principal plataforma regional de transmissão e acervo do futebol amador.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Valores</h2>
          <p className="text-futvar-light">
            Qualidade, transparência, respeito aos clubes, inovação e comunidade.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Fundadores</h2>
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-futvar-dark border border-futvar-green/20">
              <p className="font-semibold text-white">Thomas J. Ferreira — Cofundador</p>
              <p className="text-futvar-light text-sm mt-1 leading-relaxed">
                Constrói o Fly Games com foco em produto, tecnologia e crescimento do portal, garantindo uma experiência
                simples para o assinante e ferramentas claras para o admin.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-futvar-dark border border-futvar-green/20">
              <p className="font-semibold text-white">Michel Corte Nogueira — Cofundador</p>
              <p className="text-futvar-light text-sm mt-1 leading-relaxed">
                Atua no desenvolvimento e operação do projeto, com foco na execução das transmissões, organização do
                conteúdo e evolução do sistema para escala.
              </p>
            </div>
          </div>
        </section>

        <p className="text-futvar-light text-sm">
          <Link href="/" className="text-futvar-green hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
