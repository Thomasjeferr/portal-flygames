import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Evita cache em produção: planos devem ser sempre lidos do banco (novos planos criados no admin aparecem na hora). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Lista todos os planos ativos (unitário e recorrente) para exibição pública em /planos e checkout. */
export async function GET() {
  const orderBy = [
    { featured: 'desc' as const },
    { type: 'asc' as const },
    { price: 'asc' as const },
  ];

  // Apenas planos ativos: inativos não aparecem na página /planos nem no checkout.
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy,
  });

  const res = NextResponse.json(plans);
  res.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return res;
}
