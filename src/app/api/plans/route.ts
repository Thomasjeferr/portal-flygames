import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Lista todos os planos ativos (unitário e recorrente) para exibição pública em /planos e checkout. */
export async function GET() {
  const orderBy = [{ type: 'asc' as const }, { price: 'asc' as const }];

  // Preferencialmente, só planos ativos
  let plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy,
  });

  // Fallback defensivo: se por algum motivo não houver nenhum marcado como ativo,
  // retorna todos os planos existentes (para evitar tela vazia em produção).
  if (!plans.length) {
    plans = await prisma.plan.findMany({ orderBy });
  }

  return NextResponse.json(plans);
}
