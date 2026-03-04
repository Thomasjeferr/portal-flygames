import Link from 'next/link';
import { FooterExcluirContaLink } from '@/components/FooterExcluirContaLink';

/**
 * Rodapé mínimo só com a coluna Legal. Usado na página de manutenção para
 * manter Sobre o projeto, Política de privacidade, Contato etc. acessíveis.
 */
export function FooterLegalOnly() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-futvar-dark/50 mt-auto">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-12 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Legal</h3>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-futvar-light">
              <Link href="/sobre-o-projeto" className="hover:text-futvar-green transition-colors">
                Sobre o projeto
              </Link>
              <Link href="/politica-de-privacidade" className="hover:text-futvar-green transition-colors">
                Política de privacidade
              </Link>
              <Link href="/contato" className="hover:text-futvar-green transition-colors">
                Contato
              </Link>
              <Link href="/termos-de-uso" className="hover:text-futvar-green transition-colors">
                Termos de uso
              </Link>
              <Link href="/contrato-direitos-imagem" className="hover:text-futvar-green transition-colors">
                Direitos de imagem
              </Link>
              <Link href="/suporte" className="hover:text-futvar-green transition-colors">
                Suporte
              </Link>
              <FooterExcluirContaLink />
            </nav>
          </div>
          <p className="text-sm text-futvar-light/70">
            © {currentYear} Fly Games. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
