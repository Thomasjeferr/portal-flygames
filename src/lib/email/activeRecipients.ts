import { prisma } from '@/lib/db';
import type { EmailTemplateKey } from '@/lib/email/emailService';

export type Recipient = { email: string; name: string | null };

/**
 * Retorna e-mails únicos de: (1) usuários com assinatura ativa (Subscription ativa)
 * e (2) patrocinadores empresa ativos (Sponsor isActive, endAt >= now), usando o e-mail do pedido.
 */
export async function getActiveSubscriberAndSponsorEmails(): Promise<Recipient[]> {
  const now = new Date();

  const [subscribers, sponsorOrders] = await Promise.all([
    prisma.user.findMany({
      where: {
        subscription: {
          active: true,
          endDate: { gte: now },
        },
      },
      select: { email: true, name: true },
    }),
    prisma.sponsorOrder.findMany({
      where: {
        paymentStatus: 'paid',
        sponsor: {
          isActive: true,
          endAt: { gte: now },
        },
      },
      select: { email: true },
    }),
  ]);

  const byEmail = new Map<string, Recipient>();

  for (const u of subscribers) {
    if (u.email?.trim()) {
      byEmail.set(u.email.trim().toLowerCase(), {
        email: u.email.trim(),
        name: u.name?.trim() || null,
      });
    }
  }

  for (const o of sponsorOrders) {
    if (o.email?.trim()) {
      const key = o.email.trim().toLowerCase();
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          email: o.email.trim(),
          name: null,
        });
      }
    }
  }

  return Array.from(byEmail.values());
}

const BATCH_SIZE = 10;

/**
 * Envia e-mail transacional para todos os destinatários ativos (assinantes + patrocínio empresa).
 * Não bloqueia; falhas são apenas logadas. Envia em lotes para não sobrecarregar.
 */
export async function sendToActiveRecipients(
  templateKey: EmailTemplateKey,
  vars: Record<string, string>,
  baseVarsPerRecipient?: (recipient: Recipient) => Record<string, string>
): Promise<void> {
  const { sendTransactionalEmail } = await import('./emailService');
  const recipients = await getActiveSubscriberAndSponsorEmails();
  if (recipients.length === 0) return;

  const defaultName = (r: Recipient) => r.name || r.email.split('@')[0];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const promises = batch.map((r) => {
      const merged = {
        ...vars,
        name: defaultName(r),
        ...(baseVarsPerRecipient ? baseVarsPerRecipient(r) : {}),
      };
      return sendTransactionalEmail({
        to: r.email,
        templateKey,
        vars: merged,
        userId: null,
      }).catch((e) => console.error(`[activeRecipients] ${templateKey} para ${r.email}:`, e));
    });
    await Promise.all(promises);
  }
}
