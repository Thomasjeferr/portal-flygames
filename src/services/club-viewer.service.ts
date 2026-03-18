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

/** Gera login único para nova conta (primeiro slot do time). */
function generateLoginUsername(teamId: string, slotId: string): string {
  return `clube-${teamId}-${slotId.slice(-8)}`;
}

/**
 * Cria ou vincula conta de visualizador do clube para o slot (após pagamento).
 * Um login por time: se já existir ClubViewerAccount para o teamId do slot, apenas vincula o slot e envia e-mail "Novo jogo, mesmo usuário e senha".
 * Caso contrário, cria User + ClubViewerAccount e envia credenciais.
 * Idempotente: se o slot já tiver clubViewerAccountId e credentialsSentAt, não envia de novo.
 */
export async function createClubViewerAccountForSlot(slotId: string): Promise<{ ok: boolean; error?: string }> {
  const slot = await prisma.preSaleClubSlot.findUnique({
    where: { id: slotId },
    include: { preSaleGame: true },
  });
  if (!slot) return { ok: false, error: 'Slot não encontrado' };
  if (slot.paymentStatus !== 'PAID') return { ok: false, error: 'Slot não está pago' };

  const teamId =
    slot.teamId ?? (slot.slotIndex === 1 ? slot.preSaleGame.homeTeamId : slot.preSaleGame.awayTeamId) ?? null;

  // Já vinculado a uma conta e credenciais enviadas
  if (slot.clubViewerAccountId && slot.credentialsSentAt) return { ok: true };

  const existingAccount = teamId
    ? await prisma.clubViewerAccount.findUnique({ where: { teamId }, include: { user: true } })
    : null;

  if (existingAccount) {
    await prisma.preSaleClubSlot.update({
      where: { id: slotId },
      data: { clubViewerAccountId: existingAccount.id },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';
    const watchUrl = `${baseUrl}/pre-estreia/assistir/${slot.preSaleGame.slug}`;
    const recipients: string[] = [];
    if (slot.responsibleEmail?.trim()) recipients.push(slot.responsibleEmail.trim());
    const siteSettings = await prisma.siteSettings.findFirst();
    if (siteSettings?.adminCredentialsEmail?.trim()) recipients.push(siteSettings.adminCredentialsEmail.trim());
    const uniqueRecipients = Array.from(new Set(recipients));
    const maxSimultaneous = slot.preSaleGame.maxSimultaneousPerClub ?? 10;
    const limiteDispositivos = `LIMITE: ${maxSimultaneous} DISPOSITIVOS SIMULTÂNEOS`;
    const introText =
      'Novo jogo disponível na pré-estreia. Use o mesmo usuário e senha de clube que você já recebeu anteriormente.';
    const vars: Record<string, string> = {
      game_title: slot.preSaleGame.title,
      watch_url: watchUrl,
      username: existingAccount.loginUsername,
      password: '(mesma senha anterior)',
      intro_text: introText,
      max_simultaneous: String(maxSimultaneous),
      limite_dispositivos: limiteDispositivos,
      info_assinante:
        'Se o membro do time for patrocinador ativo (conta paga), desconsidere o usuário e senha abaixo: ele assiste na grade normal conforme o plano.',
    };
    for (const to of uniqueRecipients) {
      await sendTransactionalEmail({
        to,
        templateKey: 'PRE_SALE_CREDENTIALS',
        vars,
      }).catch((e) => console.error('[club-viewer] Email novo jogo mesmo login:', e));
    }

    await prisma.preSaleClubSlot.update({
      where: { id: slotId },
      data: { credentialsSentAt: new Date() },
    });
    return { ok: true };
  }

  // Nova conta: criar User + ClubViewerAccount
  const loginUsername = teamId ? generateLoginUsername(teamId, slot.id) : `clube-${slot.id.slice(-12)}`;
  const plainPassword = generatePassword(10);
  const passwordHash = await hashPassword(plainPassword);
  const internalEmail = `clubviewer-${slot.id}@${INTERNAL_EMAIL_DOMAIN}`;

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
      teamId,
      loginUsername,
    },
  });

  const account = await prisma.clubViewerAccount.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!account) return { ok: false, error: 'Erro ao criar conta clube' };

  await prisma.preSaleClubSlot.update({
    where: { id: slotId },
    data: { clubViewerAccountId: account.id },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';
  const watchUrl = `${baseUrl}/pre-estreia/assistir/${slot.preSaleGame.slug}`;
  const recipients: string[] = [];
  if (slot.responsibleEmail?.trim()) recipients.push(slot.responsibleEmail.trim());
  const siteSettings = await prisma.siteSettings.findFirst();
  if (siteSettings?.adminCredentialsEmail?.trim()) recipients.push(siteSettings.adminCredentialsEmail.trim());
  const uniqueRecipients = Array.from(new Set(recipients));

  const maxSimultaneous = slot.preSaleGame.maxSimultaneousPerClub ?? 10;
  const limiteDispositivos = `LIMITE: ${maxSimultaneous} DISPOSITIVOS SIMULTÂNEOS`;
  const infoAssinante =
    'Se o membro do time for patrocinador ativo (conta paga), desconsidere o usuário e senha abaixo: ele assiste na grade normal conforme o plano.';
  const vars: Record<string, string> = {
    game_title: slot.preSaleGame.title,
    watch_url: watchUrl,
    username: loginUsername,
    password: plainPassword,
    intro_text: 'O pagamento foi confirmado. Seguem os dados de acesso à pré-estreia.',
    max_simultaneous: String(maxSimultaneous),
    limite_dispositivos: limiteDispositivos,
    info_assinante: infoAssinante,
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
 * Se a conta for compartilhada (vários slots), a nova senha vale para todos os jogos desse time.
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
  if (siteSettings?.adminCredentialsEmail?.trim()) recipients.push(siteSettings.adminCredentialsEmail.trim());
  const uniqueRecipients = Array.from(new Set(recipients));
  const maxSimultaneous = slot.preSaleGame.maxSimultaneousPerClub ?? 10;
  const limiteDispositivos = `LIMITE: ${maxSimultaneous} DISPOSITIVOS SIMULTÂNEOS`;
  const infoAssinante =
    'Se o membro do time for patrocinador ativo (conta paga), desconsidere o usuário e senha abaixo: ele assiste na grade normal conforme o plano.';
  const vars: Record<string, string> = {
    game_title: slot.preSaleGame.title,
    watch_url: watchUrl,
    username: slot.clubViewerAccount.loginUsername,
    password: newPassword,
    max_simultaneous: String(maxSimultaneous),
    limite_dispositivos: limiteDispositivos,
    info_assinante: infoAssinante,
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
