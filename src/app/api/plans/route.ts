import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Lista planos ativos para exibição pública (escolha de plano, checkout). */
export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: [{ type: 'asc' }, { price: 'asc' }],
  });
  return NextResponse.json(plans);
}
