'use client';

import dynamic from 'next/dynamic';

const SponsorsCarousel = dynamic(
  () => import('@/components/SponsorsCarousel').then((m) => m.SponsorsCarousel),
  { ssr: false }
);

type SponsorItem = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
};

export function SponsorsCarouselWrapper({ sponsors }: { sponsors: SponsorItem[] }) {
  return <SponsorsCarousel sponsors={sponsors} />;
}
