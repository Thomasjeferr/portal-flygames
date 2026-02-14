import Link from 'next/link';
import { CONTRACT_VERSION } from '@/lib/pre-sale/enums';

export default function ContratoDireitosImagemPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Contrato de Direitos de Imagem - Pre-estreia Clubes
        </h1>
        <p className="text-futvar-light text-sm mb-8">Versao {CONTRACT_VERSION}</p>
        <div className="space-y-6 text-futvar-light">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Objeto</h2>
            <p>
              Este contrato estabelece os termos e condicoes para a utilizacao de imagens e transmissao
              de jogos no ambito do programa Pre-estreia Clubes da plataforma Fly Games.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Aceitacao</h2>
            <p>
              Ao clicar em Li e aceito no checkout da pre-estreia, o responsavel pelo clube
              declara ter lido, compreendido e concordado com todos os termos deste contrato.
            </p>
          </section>
        </div>
        <p className="mt-10 text-futvar-light text-sm">
          <Link href="/" className="text-futvar-green hover:underline">
            Voltar ao inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
