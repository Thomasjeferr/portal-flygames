import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Apenas admin pode ativar assinatura. Em produção, integrar com gateway de pagamento.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = body.userId as string;
    const days = body.days != null ? Math.max(1, Math.min(365, Number(body.days) || 1)) : null;
    const months = body.months != null ? Math.max(1, Math.min(12, Number(body.months) || 1)) : null;
    const maxConcurrentStreams =
      body.maxConcurrentStreams != null && body.maxConcurrentStreams !== ''
        ? Math.max(1, Math.min(10, Number(body.maxConcurrentStreams) || 1))
        : null;

    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
    }

    const startDate = new Date();
    const endDate = new Date();
    if (days != null && days > 0) {
      endDate.setDate(endDate.getDate() + days);
    } else {
      endDate.setMonth(endDate.getMonth() + (months ?? 1));
    }

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, active: true, startDate, endDate, maxConcurrentStreams: maxConcurrentStreams ?? undefined },
      update: { active: true, startDate, endDate, maxConcurrentStreams: maxConcurrentStreams ?? undefined },
    });

    return NextResponse.json({ message: 'Assinatura ativada.', endDate: endDate.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao ativar assinatura' }, { status: 500 });
  }
}
