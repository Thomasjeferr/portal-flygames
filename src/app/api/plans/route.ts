import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Lista todos os planos ativos (unitário e recorrente) para exibição pública em /planos e checkout. */
export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: [{ type: 'asc' }, { price: 'asc' }],
  });
  return NextResponse.json(plans);
}
