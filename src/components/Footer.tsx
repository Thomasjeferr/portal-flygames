import Link from 'next/link';
import Image from 'next/image';
import { SiPix, SiVisa, SiMastercard } from 'react-icons/si';
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

  const supportEmail = settings?.supportEmail ?? 'contato@flygames.app';
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
              Jogos de futebol de várzea com visão aérea. Filmamos suas partidas com drones para você assistir de ângulos
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
            </div>
            <div className="flex items-center gap-4 mt-4">
              {(whatsappNumber || true) && (
                <a
                  href={`https://wa.me/5551995817296?text=${encodeURIComponent('Olá, vim do Flygames e gostaria de mais informações!')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#25D366] hover:opacity-90 transition-opacity"
                  aria-label="WhatsApp"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-90 transition-opacity"
                  aria-label="Instagram"
                >
                  <svg className="w-8 h-8" fill="url(#instagram-gradient)" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:opacity-90 transition-opacity"
                  aria-label="TikTok"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                  </svg>
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF0000] hover:opacity-90 transition-opacity"
                  aria-label="YouTube"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
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
              <Link href="/patrocinar" className="hover:text-futvar-green transition-colors">
                Seja Patrocinador
              </Link>
              <Link href="/parceiros" className="hover:text-futvar-green transition-colors">
                Programa de parceiros
              </Link>
              <Link href="/sobre-nos" className="hover:text-futvar-green transition-colors">
                Sobre nós
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
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {/* PIX - fundo branco para contraste, cor oficial */}
              <span className="inline-flex items-center justify-center rounded-lg bg-white p-2 shadow-sm" title="PIX">
                <SiPix className="w-8 h-8 text-[#32BCAD]" aria-hidden />
              </span>
              {/* Visa - fundo branco, azul oficial */}
              <span className="inline-flex items-center justify-center rounded-lg bg-white p-2 shadow-sm" title="Visa">
                <SiVisa className="w-8 h-8 text-[#1A1F71]" aria-hidden />
              </span>
              {/* Mastercard - fundo branco, cores oficiais via ícone */}
              <span className="inline-flex items-center justify-center rounded-lg bg-white p-2 shadow-sm" title="Mastercard">
                <SiMastercard className="w-8 h-8 text-[#EB001B]" aria-hidden />
              </span>
            </div>
            <p className="text-xs text-futvar-light/80">
              Pagamentos processados com segurança via Stripe e Woovi.
            </p>
          </div>
        </div>

        {/* Linha compacta de patrocinadores */}
        <div className="mt-10 pt-8 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className="text-xs text-futvar-light/70 tracking-wider">Patrocinadores</p>
            <Link href="/patrocinar" className="text-sm text-futvar-green hover:text-futvar-green-light font-medium">
              Seja um Patrocinador →
            </Link>
          </div>
          {sponsors.length > 0 && (
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
          )}
        </div>

        {/* Base */}
        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-futvar-light/70">
          <div className="flex flex-col gap-1">
            <a
              href="https://wa.me/5551995817296"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-futvar-green transition-colors"
            >
              Desenvolvedor Thomas J Ferreira
            </a>
            <p>© {currentYear} {companyName}. Todos os direitos reservados.</p>
          </div>
          {companyCnpj && <p>CNPJ: {companyCnpj}</p>}
        </div>
      </div>
    </footer>
  );
}
