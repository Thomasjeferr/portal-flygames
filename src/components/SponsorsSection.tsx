import Link from 'next/link';
import { getPublicSponsors } from '@/services/sponsorsService';
import { SponsorsCarouselWrapper } from '@/components/SponsorsCarouselWrapper';

const TIER_ORDER = ['MASTER', 'OFICIAL', 'APOIO'] as const;

export async function SponsorsSection() {
  const sponsors = await getPublicSponsors();
  if (sponsors.length === 0) return null;

  const byTier = TIER_ORDER.reduce(
    (acc, tier) => {
      acc[tier] = sponsors.filter((s) => s.tier === tier).map((s) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logoUrl,
        websiteUrl: s.websiteUrl,
        whatsapp: s.whatsapp ?? null,
        instagram: s.instagram ?? null,
      }));
      return acc;
    },
    {} as Record<string, Array<{ id: string; name: string; logoUrl: string; websiteUrl: string | null; whatsapp: string | null; instagram: string | null }>>
  );

  return (
    <section className="py-14 lg:py-18 px-4 lg:px-12 border-t border-white/5">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fade-in-up opacity-0 [animation-delay:0.3s]">
          <div className="flex items-center gap-3">
            <span className="w-1 h-8 rounded-full bg-futvar-gold" />
            <h2 className="text-2xl lg:text-3xl font-bold text-white uppercase tracking-wide">Patrocinadores</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/patrocinar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors text-sm"
            >
              Seja um Patrocinador
            </Link>
            <Link
              href="/parceiros"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-futvar-green/60 text-sm font-semibold text-futvar-green hover:bg-futvar-green/10 transition-colors"
            >
              Programa de parceiros
            </Link>
          </div>
        </div>
        <SponsorsCarouselWrapper byTier={byTier} />
      </div>
    </section>
  );
}
