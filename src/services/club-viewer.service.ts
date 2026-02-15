import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendEmailToMany } from '@/lib/email/emailService';

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

function buildCredentialsEmailHtml(params: {
  gameTitle: string;
  watchUrl: string;
  username: string;
  password: string;
  isNewPassword?: boolean;
}): string {
  const { gameTitle, watchUrl, username, password, isNewPassword } = params;
  const title = isNewPassword ? 'Nova senha de acesso à pré-estreia' : 'Acesso à pré-estreia - Credenciais';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111;">${title}</h2>
  <p>Olá,</p>
  <p>${isNewPassword ? 'Foi gerada uma nova senha para o acesso à pré-estreia.' : 'O pagamento foi confirmado. Seguem os dados de acesso à pré-estreia:'}</p>
  <p><strong>Jogo:</strong> ${gameTitle}</p>
  <p><strong>Link para assistir:</strong> <a href="${watchUrl}">${watchUrl}</a></p>
  <p><strong>Usuário:</strong> <code style="background: #f0f0f0; padding: 2px 6px;">${username}</code></p>
  <p><strong>Senha:</strong> <code style="background: #f0f0f0; padding: 2px 6px;">${password}</code></p>
  <p>Compartilhe o usuário e a senha com os membros do clube. Este acesso vale apenas para este jogo de pré-estreia.</p>
  <p>Para comprar planos ou outros jogos no site, é necessário criar uma conta normal (cadastro).</p>
  <p style="margin-top: 24px; color: #666; font-size: 12px;">Fly Games - Pré-estreia Clubes</p>
</body>
</html>
  `.trim();
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.flygames.com.br';
  const watchUrl = `${baseUrl}/pre-estreia/assistir/${slot.preSaleGame.slug}`;
  const html = buildCredentialsEmailHtml({
    gameTitle: slot.preSaleGame.title,
    watchUrl,
    username: loginUsername,
    password: plainPassword,
  });

  const recipients: string[] = [];
  if (slot.responsibleEmail?.trim()) recipients.push(slot.responsibleEmail.trim());
  const siteSettings = await prisma.siteSettings.findFirst();
  if (siteSettings?.adminCredentialsEmail?.trim())
    recipients.push(siteSettings.adminCredentialsEmail.trim());
  const uniqueRecipients = [...new Set(recipients)];

  if (uniqueRecipients.length > 0) {
    const subject = `Acesso à pré-estreia: ${slot.preSaleGame.title}`;
    await sendEmailToMany(uniqueRecipients, subject, html);
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.flygames.com.br';
  const watchUrl = `${baseUrl}/pre-estreia/assistir/${slot.preSaleGame.slug}`;
  const html = buildCredentialsEmailHtml({
    gameTitle: slot.preSaleGame.title,
    watchUrl,
    username: slot.clubViewerAccount.loginUsername,
    password: newPassword,
    isNewPassword: true,
  });

  const recipients: string[] = [];
  if (slot.responsibleEmail?.trim()) recipients.push(slot.responsibleEmail.trim());
  const siteSettings = await prisma.siteSettings.findFirst();
  if (siteSettings?.adminCredentialsEmail?.trim())
    recipients.push(siteSettings.adminCredentialsEmail.trim());
  const uniqueRecipients = [...new Set(recipients)];
  if (uniqueRecipients.length > 0) {
    await sendEmailToMany(
      uniqueRecipients,
      `Nova senha - Pré-estreia: ${slot.preSaleGame.title}`,
      html
    );
  }

  await prisma.preSaleClubSlot.update({
    where: { id: slotId },
    data: { credentialsSentAt: new Date() },
  });

  return { password: newPassword };
}
