import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const bodySchema = z.object({
  planCommissionPercent: z.number().int().min(0).max(100),
  gameCommissionPercent: z.number().int().min(0).max(100),
  sponsorCommissionPercent: z.number().int().min(0).max(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  await prisma.partner.update({
    where: { id },
    data: {
      planCommissionPercent: parsed.data.planCommissionPercent,
      gameCommissionPercent: parsed.data.gameCommissionPercent,
      sponsorCommissionPercent: parsed.data.sponsorCommissionPercent,
    },
  });

  return NextResponse.json({ ok: true });
}

