'use client';

import dynamic from 'next/dynamic';

const SponsorsCarousel = dynamic(
  () => import('@/components/SponsorsCarousel').then((m) => m.SponsorsCarousel),
  { ssr: false }
);

const TIER_ORDER = ['MASTER', 'OFICIAL', 'APOIO'] as const;
const TIER_LABEL: Record<string, string> = {
  MASTER: 'Patrocinador Master',
  OFICIAL: 'Patrocinador Oficial',
  APOIO: 'Apoio',
};

type SponsorItem = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
};

export function SponsorsCarouselWrapper({
  byTier,
}: {
  byTier: Record<string, SponsorItem[]>;
}) {
  return (
    <div className="space-y-10">
      {TIER_ORDER.map((tier) => {
        const list = byTier[tier] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={tier}>
            <h3 className="text-sm font-medium text-futvar-light/80 tracking-wider mb-4">
              {TIER_LABEL[tier] ?? tier}
            </h3>
            <SponsorsCarousel sponsors={list} />
          </div>
        );
      })}
    </div>
  );
}
