import Link from 'next/link';
import { ManutencaoContent } from './ManutencaoContent';

export const metadata = {
  title: 'Em manutenção | Fly Games',
  description: 'Estamos preparando uma nova experiência para assistir ao futebol amador. A plataforma estará disponível em breve.',
};

const maintenanceText = `Estamos preparando uma nova experiência para assistir ao futebol amador.
A plataforma está sendo finalizada e estará disponível em breve.
Obrigado por acompanhar o projeto.`;

const legalLinks = [
  { href: '/sobre-o-projeto', label: 'Sobre o projeto' },
  { href: '/politica-de-privacidade', label: 'Política de privacidade' },
  { href: '/contato', label: 'Contato' },
  { href: '/termos-de-uso', label: 'Termos de uso' },
  { href: '/contrato-direitos-imagem', label: 'Direitos de imagem' },
  { href: '/suporte', label: 'Suporte' },
  { href: '/excluir-conta', label: 'Excluir conta' },
];

export default function ManutencaoPage() {
  return (
    <div className="min-h-screen bg-[#0a0f0d] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Caixa estilo recomendado: marca + mensagem + copiar */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-6">
            <span className="text-lg font-bold text-[#19d37a]">FlyGames</span>
            <ManutencaoContent text={maintenanceText} />
          </div>
          <div className="space-y-3 text-[#94a3b8] text-center sm:text-left">
            <p>
              Estamos preparando uma nova experiência para assistir ao futebol amador.
            </p>
            <p>
              A plataforma está sendo finalizada e estará disponível em breve.
            </p>
            <p>
              Obrigado por acompanhar o projeto.
            </p>
          </div>
        </div>

        {/* Links Legal discretos abaixo do card (bem ocultos) */}
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/30 hover:text-white/50 transition-colors"
          aria-label="Links legais"
        >
          {legalLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-[#19d37a]/70">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
