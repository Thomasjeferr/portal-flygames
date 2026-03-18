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

/**
 * Pré-estreia clubes: cria ou vincula conta de visualizador e envia e-mail com credenciais ÚNICAS.
 * Usa APENAS os templates PRE_SALE_CREDENTIALS e (em regenerateClubViewerPassword) PRE_SALE_CREDENTIALS_NEW_PASSWORD.
 * Não envia SUBSCRIPTION_ACTIVATED nem PURCHASE_CONFIRMATION; esse fluxo é exclusivo da pré-estreia.
 *
 * Um login por time: se já existir ClubViewerAccount para o teamId do slot, vincula o slot e envia "mesmo usuário e senha".
 * Caso contrário, cria User + ClubViewerAccount com usuário/senha novos e envia PRE_SALE_CREDENTIALS.
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
  // Garantir que o responsável do time receba sempre: primeiro slot.responsibleEmail (gravado no checkout), depois fallback no time
  const responsibleEmail =
    slot.responsibleEmail?.trim() ||
    (teamId ? (await prisma.team.findUnique({ where: { id: teamId }, select: { responsibleEmail: true } }))?.responsibleEmail?.trim() : null) ||
    null;
  const recipients: string[] = [];
  if (responsibleEmail) recipients.push(responsibleEmail);
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
    let atLeastOneSent = false;
    for (const to of uniqueRecipients) {
      const result = await sendTransactionalEmail({ to, templateKey: 'PRE_SALE_CREDENTIALS', vars });
      if (result.success) atLeastOneSent = true;
      else console.error('[club-viewer] Falha ao enviar email novo jogo mesmo login para', to, result.error);
    }
    if (uniqueRecipients.length === 0) {
      console.warn('[club-viewer] Slot', slotId, 'sem destinatários para credenciais (conta existente)');
    }
    if (atLeastOneSent) {
      await prisma.preSaleClubSlot.update({
        where: { id: slotId },
        data: { credentialsSentAt: new Date() },
      });
    }
    return { ok: true };
  }

  // Nova conta: criar User + ClubViewerAccount. Login em formato e-mail (com @) para funcionar no campo E-mail da página Entrar.
  let loginUsername: string;
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { slug: true, shortName: true, name: true },
    });
    const baseName = (team?.shortName || team?.slug || team?.name || slot.clubName || 'clube')
      .toLowerCase()
      .trim();
    const normalized = baseName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18);
    const suffix = Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
    loginUsername = `clube-${normalized || 'time'}-${suffix}@${INTERNAL_EMAIL_DOMAIN}`;
  } else {
    loginUsername = `clube-${slot.id.slice(-8)}@${INTERNAL_EMAIL_DOMAIN}`;
  }
  const plainPassword = generatePassword(10);
  const passwordHash = await hashPassword(plainPassword);

  const user = await prisma.user.create({
    data: {
      email: loginUsername,
      passwordHash,
      role: 'club_viewer',
      emailVerified: true, // conta pré-estreia: não exige verificação de e-mail (login direto com usuário/senha)
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
  // Garantir que o responsável do time receba sempre: primeiro slot.responsibleEmail (gravado no checkout), depois fallback no time
  const responsibleEmail =
    slot.responsibleEmail?.trim() ||
    (teamId ? (await prisma.team.findUnique({ where: { id: teamId }, select: { responsibleEmail: true } }))?.responsibleEmail?.trim() : null) ||
    null;
  const recipients: string[] = [];
  if (responsibleEmail) recipients.push(responsibleEmail);
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
  let atLeastOneSent = false;
  for (const to of uniqueRecipients) {
    const result = await sendTransactionalEmail({ to, templateKey: 'PRE_SALE_CREDENTIALS', vars });
    if (result.success) atLeastOneSent = true;
    else console.error('[club-viewer] Falha ao enviar credenciais pré-estreia para', to, result.error);
  }
  if (uniqueRecipients.length === 0) {
    console.warn('[club-viewer] Slot', slotId, 'sem destinatários para credenciais (nova conta)');
  }
  if (atLeastOneSent) {
    await prisma.preSaleClubSlot.update({
      where: { id: slotId },
      data: { credentialsSentAt: new Date() },
    });
  }

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
  const teamId =
    slot.teamId ?? (slot.slotIndex === 1 ? slot.preSaleGame.homeTeamId : slot.preSaleGame.awayTeamId) ?? null;
  const responsibleEmail =
    slot.responsibleEmail?.trim() ||
    (teamId ? (await prisma.team.findUnique({ where: { id: teamId }, select: { responsibleEmail: true } }))?.responsibleEmail?.trim() : null) ||
    null;
  const recipients: string[] = [];
  if (responsibleEmail) recipients.push(responsibleEmail);
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
