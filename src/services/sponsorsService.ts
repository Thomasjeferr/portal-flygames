import { prisma } from '@/lib/db';

const TIER_ORDER: Record<string, number> = { MASTER: 0, OFICIAL: 1, APOIO: 2 };

/** Retorna patrocinadores visíveis publicamente: ativos, dentro do período */
export async function getPublicSponsors() {
  const now = new Date();
  const all = await prisma.sponsor.findMany({
    where: { isActive: true },
  });

  const filtered = all.filter((s) => {
    if (s.startAt && s.startAt > now) return false;
    if (s.endAt && s.endAt < now) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const tierDiff = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
    if (tierDiff !== 0) return tierDiff;
    return a.priority - b.priority;
  });
}

/** Para rodapé: só Master e Oficial (opcional, quando muitos) */
export async function getCompactSponsors() {
  const all = await getPublicSponsors();
  return all.filter((s) => s.tier === 'MASTER' || s.tier === 'OFICIAL');
}
