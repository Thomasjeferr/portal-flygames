import Image from 'next/image';
import { getPublicSponsors } from '@/services/sponsorsService';

const TIER_ORDER = ['MASTER', 'OFICIAL', 'APOIO'] as const;
const TIER_LABEL: Record<string, string> = {
  MASTER: 'Patrocinador Master',
  OFICIAL: 'Patrocinador Oficial',
  APOIO: 'Apoio',
};

function getLogoUrl(url: string) {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  return url;
}

export async function SponsorsSection() {
  const sponsors = await getPublicSponsors();
  if (sponsors.length === 0) return null;

  const byTier = TIER_ORDER.reduce(
    (acc, tier) => {
      acc[tier] = sponsors.filter((s) => s.tier === tier);
      return acc;
    },
    {} as Record<string, typeof sponsors>
  );

  return (
    <section className="py-14 lg:py-18 px-4 lg:px-12 border-t border-white/5">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up opacity-0 [animation-delay:0.3s]">
          <span className="w-1 h-8 rounded-full bg-futvar-gold" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white">Quem nos patrocina</h2>
        </div>
        <div className="space-y-10">
          {TIER_ORDER.map((tier) => {
            const list = byTier[tier] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={tier}>
                <h3 className="text-sm font-medium text-futvar-light/80 uppercase tracking-wider mb-4">
                  {TIER_LABEL[tier] ?? tier}
                </h3>
                <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                  {list.map((s) => {
                    const logoUrl = getLogoUrl(s.logoUrl);
                    const Wrapper = s.websiteUrl ? 'a' : 'div';
                    return (
                      <Wrapper
                        key={s.id}
                        {...(s.websiteUrl
                          ? {
                              href: s.websiteUrl,
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              className:
                                'flex items-center justify-center h-14 w-auto max-w-[140px] grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition-all duration-300',
                            }
                          : {
                              className:
                                'flex items-center justify-center h-14 w-auto max-w-[140px] grayscale opacity-80',
                            })}
                      >
                        <Image
                          src={logoUrl}
                          alt={s.name}
                          width={120}
                          height={56}
                          className="object-contain h-14 w-auto max-w-[140px]"
                          unoptimized={logoUrl.startsWith('http')}
                        />
                      </Wrapper>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
