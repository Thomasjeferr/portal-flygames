import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Expira assinaturas cujo endDate já passou (ex.: plano degustação 7/30 dias).
 * Deve ser chamado por um cron (Vercel Cron, GitHub Actions, etc.) com CRON_SECRET.
 *
 * GET ou POST com header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  return runExpire(request);
}

export async function POST(request: NextRequest) {
  return runExpire(request);
}

async function runExpire(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('[cron/expire-subscriptions] CRON_SECRET não definido');
    return NextResponse.json({ error: 'Cron não configurado' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const now = new Date();

    const result = await prisma.subscription.updateMany({
      where: {
        active: true,
        endDate: { lt: now },
      },
      data: { active: false },
    });

    return NextResponse.json({
      ok: true,
      expiredCount: result.count,
      message: result.count > 0 ? `${result.count} assinatura(s) expirada(s) desativada(s).` : 'Nenhuma assinatura a expirar.',
    });
  } catch (e) {
    console.error('[cron/expire-subscriptions]', e);
    return NextResponse.json({ error: 'Erro ao expirar assinaturas' }, { status: 500 });
  }
}
