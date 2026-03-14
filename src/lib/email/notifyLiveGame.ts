import { prisma } from '@/lib/db';
import { normalizeAppBaseUrl } from '@/lib/email/emailService';
import { sendToActiveRecipients } from '@/lib/email/activeRecipients';

const PT_BR_DATETIME = {
  day: '2-digit' as const,
  month: '2-digit' as const,
  year: 'numeric' as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
  timeZone: 'America/Sao_Paulo' as const,
};

async function getBaseVars() {
  const row = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  const appBaseUrl = normalizeAppBaseUrl(row?.appBaseUrl);
  return {
    brand_color: row?.brandColor ?? '#22c55e',
    footer_text: row?.footerText ?? '',
    appBaseUrl,
  };
}

/** Envia e-mail "live programada" para assinantes e patrocinadores ativos. Fire-and-forget. */
export function notifyLiveScheduled(live: { id: string; title: string; startAt: Date | null }) {
  getBaseVars().then(({ appBaseUrl, brand_color, footer_text }) => {
    const live_url = `${appBaseUrl}/live/${live.id}`;
    const live_start_at = live.startAt
      ? new Date(live.startAt).toLocaleString('pt-BR', PT_BR_DATETIME)
      : '';
    sendToActiveRecipients('LIVE_SCHEDULED', {
      live_title: live.title,
      live_start_at,
      live_url,
      brand_color,
      footer_text,
    }).catch((e) => console.error('[notifyLiveScheduled]', e));
  });
}

/**
 * Marca a live como "notificação enviada" e envia "live iniciada" uma vez.
 * Retorna true se esta chamada foi a que enviou; false se já estava notificado.
 * Pode ser chamado pelo PATCH admin e pela página /live/[id] (passagem automática).
 */
export async function notifyLiveStartedOnce(liveId: string): Promise<boolean> {
  const updated = await prisma.live.updateMany({
    where: { id: liveId, notifiedStartedAt: null },
    data: { notifiedStartedAt: new Date() },
  });
  if (updated.count === 0) return false;
  const live = await prisma.live.findUnique({
    where: { id: liveId },
    select: { id: true, title: true },
  });
  if (!live) return true;
  const { appBaseUrl, brand_color, footer_text } = await getBaseVars();
  const live_url = `${appBaseUrl}/live/${live.id}`;
  sendToActiveRecipients('LIVE_STARTED', {
    live_title: live.title,
    live_url,
    brand_color,
    footer_text,
  }).catch((e) => console.error('[notifyLiveStarted]', e));
  return true;
}

/** Envia "live cancelada" antes de deletar. Chame antes de prisma.live.delete. */
export function notifyLiveCancelled(live: { title: string; startAt: Date | null }) {
  getBaseVars().then(({ footer_text }) => {
    const live_start_line = live.startAt
      ? `Ela estava programada para ${new Date(live.startAt).toLocaleString('pt-BR', PT_BR_DATETIME)}.`
      : '';
    sendToActiveRecipients('LIVE_CANCELLED', {
      live_title: live.title,
      live_start_line,
      footer_text,
    }).catch((e) => console.error('[notifyLiveCancelled]', e));
  });
}

/** Envia "jogo publicado" para assinantes e patrocinadores ativos. Fire-and-forget. */
export function notifyGamePublished(game: { slug: string; title: string; championship: string }) {
  getBaseVars().then(({ appBaseUrl, brand_color, footer_text }) => {
    const game_url = `${appBaseUrl}/jogo/${game.slug}`;
    sendToActiveRecipients('GAME_PUBLISHED', {
      game_title: game.title,
      game_championship: game.championship,
      game_url,
      brand_color,
      footer_text,
    }).catch((e) => console.error('[notifyGamePublished]', e));
  });
}
