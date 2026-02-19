import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendTransactionalEmail } from '@/lib/email/emailService';

const INTERNAL_EMAIL_DOMAIN = 'clubviewer.interno.portal';

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUsername(slotId: string, slotIndex: number): string {
  const suffix = slotId.slice(-6);
  return `clube-${suffix}-${slotIndex}`;
}

/**
 * Cria conta de visualizador do clube para o slot (após pagamento) e envia credenciais por e-mail.
 * Idempotente: se já existir ClubViewerAccount para o slot, não cria outro.
 */
export async function createClubViewerAccountForSlot(slotId: string): Promise<{ ok: boolean; error?: string }> {
  const slot = await prisma.preSaleClubSlot.findUnique({
    where: { id: slotId },
    include: { preSaleGame: true },
  });
  if (!slot) return { ok: false, error: 'Slot não encontrado' };
  if (slot.paymentStatus !== 'PAID') return { ok: false, error: 'Slot não está pago' };

  const existing = await prisma.clubViewerAccount.findUnique({
    where: { preSaleClubSlotId: slotId },
  });
  if (existing) return { ok: true }; // já criado

  const loginUsername = generateUsername(slot.id, slot.slotIndex);
  const plainPassword = generatePassword(10);
  const passwordHash = await hashPassword(plainPassword);
  const internalEmail = `clubviewer-${slot.id}@${INTERNAL_EMAIL_DOMAIN}`;

  const existingUserWithEmail = await prisma.user.findUnique({
    where: { email: internalEmail },
  });
  if (existingUserWithEmail) {
    await prisma.clubViewerAccount.upsert({
      where: { preSaleClubSlotId: slotId },
      create: { userId: existingUserWithEmail.id, preSaleClubSlotId: slotId, loginUsername },
      update: {},
    });
    await prisma.preSaleClubSlot.update({
      where: { id: slotId },
      data: { credentialsSentAt: new Date() },
    });
    return { ok: true };
  }

  const user = await prisma.user.create({
    data: {
      email: internalEmail,
      passwordHash,
      role: 'club_viewer',
      name: `Clube ${slot.clubName} (Slot ${slot.slotIndex})`,
    },
  });

  await prisma.clubViewerAccount.create({
    data: {
      userId: user.id,
      preSaleClubSlotId: slotId,
      loginUsername,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';
  const watchUrl = `${baseUrl}/pre-estreia/assistir/${slot.preSaleGame.slug}`;
  const recipients: string[] = [];
  if (slot.responsibleEmail?.trim()) recipients.push(slot.responsibleEmail.trim());
  const siteSettings = await prisma.siteSettings.findFirst();
  if (siteSettings?.adminCredentialsEmail?.trim())
    recipients.push(siteSettings.adminCredentialsEmail.trim());
  const uniqueRecipients = Array.from(new Set(recipients));

  const vars = {
    game_title: slot.preSaleGame.title,
    watch_url: watchUrl,
    username: loginUsername,
    password: plainPassword,
    intro_text: 'O pagamento foi confirmado. Seguem os dados de acesso à pré-estreia.',
  };
  for (const to of uniqueRecipients) {
    await sendTransactionalEmail({
      to,
      templateKey: 'PRE_SALE_CREDENTIALS',
      vars,
    }).catch((e) => console.error('[club-viewer] Email credenciais:', e));
  }

  await prisma.preSaleClubSlot.update({
    where: { id: slotId },
    data: { credentialsSentAt: new Date() },
  });

  return { ok: true };
}

/**
 * Gera nova senha para a conta clube do slot e envia por e-mail.
 * Retorna a nova senha em texto para exibir uma vez no admin.
 */
export async function regenerateClubViewerPassword(slotId: string): Promise<{ password: string; error?: string }> {
  const slot = await prisma.preSaleClubSlot.findUnique({
    where: { id: slotId },
    include: { preSaleGame: true, clubViewerAccount: { include: { user: true } } },
  });
  if (!slot) return { password: '', error: 'Slot não encontrado' };
  if (!slot.clubViewerAccount) return { password: '', error: 'Este slot não possui conta clube' };

  const newPassword = generatePassword(10);
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: slot.clubViewerAccount.userId },
    data: { passwordHash },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';
  const watchUrl = `${baseUrl}/pre-estreia/assistir/${slot.preSaleGame.slug}`;
  const recipients: string[] = [];
  if (slot.responsibleEmail?.trim()) recipients.push(slot.responsibleEmail.trim());
  const siteSettings = await prisma.siteSettings.findFirst();
  if (siteSettings?.adminCredentialsEmail?.trim())
    recipients.push(siteSettings.adminCredentialsEmail.trim());
  const uniqueRecipients = Array.from(new Set(recipients));
  const vars = {
    game_title: slot.preSaleGame.title,
    watch_url: watchUrl,
    username: slot.clubViewerAccount.loginUsername,
    password: newPassword,
  };
  for (const to of uniqueRecipients) {
    await sendTransactionalEmail({
      to,
      templateKey: 'PRE_SALE_CREDENTIALS_NEW_PASSWORD',
      vars,
    }).catch((e) => console.error('[club-viewer] Email nova senha:', e));
  }

  await prisma.preSaleClubSlot.update({
    where: { id: slotId },
    data: { credentialsSentAt: new Date() },
  });

  return { password: newPassword };
}
