import { prisma } from '@/lib/db';
import { isTeamResponsible } from '@/lib/access';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';
import { checkTrialGrantedByIpLimit, incrementTrialGrantedByIp } from '@/lib/email/rateLimit';

const TRIAL_DAYS = 7;
const TRIAL_MAX_STREAMS = 2;

/**
 * Concede 7 dias de degustação (máx. 2 telas) ao usuário se:
 * - SiteSettings.autoTrialEnabled estiver true;
 * - o usuário ainda não tiver Subscription;
 * - o usuário NÃO for responsável de time (TeamManager ou Team.responsibleEmail);
 * - o IP não tiver atingido o limite (2 trials por 30 dias).
 * Envia e-mail SUBSCRIPTION_ACTIVATED ao conceder.
 * Não lança erro; falhas são apenas logadas.
 */
export async function grantTrialIfEligible(userId: string, ip: string): Promise<boolean> {
  try {
    const [siteSettings, existingSubscription, teamResponsible, userForRole] = await Promise.all([
      prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } }),
      prisma.subscription.findUnique({ where: { userId } }),
      isTeamResponsible(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);

    if (!siteSettings?.autoTrialEnabled) return false;
    if (existingSubscription) return false;
    if (teamResponsible) return false;
    if (userForRole?.role === 'club_viewer' || userForRole?.role === 'game_contract_viewer') return false;

    const ipAllowed = await checkTrialGrantedByIpLimit(ip);
    if (!ipAllowed) return false;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + TRIAL_DAYS);

    await prisma.subscription.create({
      data: {
        userId,
        active: true,
        startDate,
        endDate,
        maxConcurrentStreams: TRIAL_MAX_STREAMS,
      },
    });

    await incrementTrialGrantedByIp(ip);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      const emailSettings = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
      const appBaseUrl = normalizeAppBaseUrl(emailSettings?.appBaseUrl);
      const loginUrl = `${appBaseUrl}/entrar`;
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
          period_label: '7 dias (degustação)',
          end_date: endDateFormatted,
          login_url: loginUrl,
          brand_color: emailSettings?.brandColor ?? '#22c55e',
          footer_text: emailSettings?.footerText ?? '',
        },
        userId,
      }).catch((e) => console.error('[Trial auto] E-mail:', e));
    }

    return true;
  } catch (e) {
    console.error('[grantTrialIfEligible]', e);
    return false;
  }
}
