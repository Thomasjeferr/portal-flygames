import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { getCompactSponsors } from '@/services/sponsorsService';

async function getSiteSettings() {
  try {
    const row = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? null;
  } catch {
    return null;
  }
}

export async function Footer() {
  const [settings, sponsors] = await Promise.all([getSiteSettings(), getCompactSponsors()]);

  const supportEmail = settings?.supportEmail ?? 'contato@flygames.com.br';
  const whatsappNumber = settings?.whatsappNumber ?? '5511999999999';
  const instagramUrl = settings?.instagramUrl ?? 'https://instagram.com';
  const tiktokUrl = settings?.tiktokUrl ?? null;
  const youtubeUrl = settings?.youtubeUrl ?? null;
  const companyName = settings?.companyName ?? 'Fly Games';
  const companyCnpj = settings?.companyCnpj ?? '';

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-futvar-dark/50">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-12 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Coluna 1: Fly Games */}
          <div>
            <h3 className="text-lg font-bold text-futvar-green mb-3">FLY GAMES</h3>
            <p className="text-sm text-futvar-light/90 mb-4 max-w-xs">
              Jogos de várzea com visão aérea. Filmamos suas partidas com drones para você assistir de ângulos
              incríveis.
            </p>
            <div className="space-y-2 text-sm text-futvar-light">
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="block hover:text-futvar-green transition-colors"
                >
                  {supportEmail}
                </a>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-futvar-green transition-colors"
                >
                  WhatsApp
                </a>
              )}
            </div>
            <div className="flex gap-4 mt-4">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-futvar-light hover:text-futvar-green transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-futvar-light hover:text-futvar-green transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                  </svg>
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-futvar-light hover:text-futvar-green transition-colors"
                  aria-label="YouTube"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Coluna 2: Navegação */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Navegação</h3>
            <nav className="flex flex-col gap-2 text-sm text-futvar-light">
              <Link href="/" className="hover:text-futvar-green transition-colors">
                Início
              </Link>
              <Link href="/#jogos" className="hover:text-futvar-green transition-colors">
                Jogos
              </Link>
              <Link href="/#pre-estreia" className="hover:text-futvar-green transition-colors">
                Pré-estreia
              </Link>
              <Link href="/planos" className="hover:text-futvar-green transition-colors">
                Planos
              </Link>
              <Link href="/entrar" className="hover:text-futvar-green transition-colors">
                Entrar
              </Link>
              <Link href="/conta" className="hover:text-futvar-green transition-colors">
                Minha conta
              </Link>
            </nav>
          </div>

          {/* Coluna 3: Legal */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Legal</h3>
            <nav className="flex flex-col gap-2 text-sm text-futvar-light">
              <Link href="/termos-de-uso" className="hover:text-futvar-green transition-colors">
                Termos de uso
              </Link>
              <Link href="/politica-de-privacidade" className="hover:text-futvar-green transition-colors">
                Política de privacidade
              </Link>
              <Link href="/contrato-direitos-imagem" className="hover:text-futvar-green transition-colors">
                Direitos de imagem
              </Link>
              <Link href="/suporte" className="hover:text-futvar-green transition-colors">
                Suporte
              </Link>
            </nav>
          </div>

          {/* Coluna 4: Pagamentos */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Formas de pagamento</h3>
            <div className="flex flex-wrap gap-3 mb-3">
              <span className="inline-flex items-center px-3 py-2 rounded-lg bg-white/5 text-sm font-medium text-futvar-light">
                PIX
              </span>
              <span className="inline-flex items-center px-3 py-2 rounded-lg bg-white/5 text-sm font-medium text-futvar-light">
                Cartão
              </span>
            </div>
            <p className="text-xs text-futvar-light/80">
              Pagamentos processados com segurança via Stripe e Woovi.
            </p>
          </div>
        </div>

        {/* Linha compacta de patrocinadores */}
        {sponsors.length > 0 && (
          <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-xs text-futvar-light/70 uppercase tracking-wider mb-4">Patrocinadores</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {sponsors.map((s) => {
                const logoUrl = s.logoUrl.startsWith('http') ? s.logoUrl : s.logoUrl;
                return (
                  <div key={s.id} className="h-10 w-auto max-w-[100px] grayscale opacity-70">
                    {s.websiteUrl ? (
                      <a
                        href={s.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-full w-full hover:opacity-100 transition-opacity"
                      >
                        <Image
                          src={logoUrl}
                          alt={s.name}
                          width={100}
                          height={40}
                          className="object-contain h-10 w-auto max-w-[100px]"
                          unoptimized={logoUrl.startsWith('http')}
                        />
                      </a>
                    ) : (
                      <Image
                        src={logoUrl}
                        alt={s.name}
                        width={100}
                        height={40}
                        className="object-contain h-10 w-auto max-w-[100px]"
                        unoptimized={logoUrl.startsWith('http')}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Base */}
        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-futvar-light/70">
          <p>© {currentYear} {companyName}. Todos os direitos reservados.</p>
          {companyCnpj && <p>CNPJ: {companyCnpj}</p>}
        </div>
      </div>
    </footer>
  );
}
