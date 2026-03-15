import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isTeamResponsible } from '@/lib/access';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';

// Apenas admin pode ativar assinatura. Em produção, integrar com gateway de pagamento.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = body.userId as string;

    const teamResponsible = await isTeamResponsible(userId);
    if (teamResponsible) {
      return NextResponse.json(
        { error: 'Responsável de time não pode ter assinatura ativa (nem degustação nem paga).' },
        { status: 400 }
      );
    }
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      const settings = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
      const appBaseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
      const loginUrl = `${appBaseUrl}/entrar`;
      const periodLabel =
        days != null && days > 0
          ? days === 7
            ? '7 dias (degustação)'
            : `${days} dias`
          : `${months ?? 1} ${(months ?? 1) === 1 ? 'mês' : 'meses'}`;
      const endDateFormatted = endDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      sendTransactionalEmail({
        to: user.email,
        templateKey: 'SUBSCRIPTION_ACTIVATED',
        vars: {
          name: user.name?.trim() || user.email.split('@')[0],
          period_label: periodLabel,
          end_date: endDateFormatted,
          login_url: loginUrl,
          brand_color: settings?.brandColor ?? '#22c55e',
          footer_text: settings?.footerText ?? '',
        },
        userId,
      }).catch((e) => console.error('[Subscription activate] E-mail:', e));
    }

    return NextResponse.json({ message: 'Assinatura ativada.', endDate: endDate.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao ativar assinatura' }, { status: 500 });
  }
}
