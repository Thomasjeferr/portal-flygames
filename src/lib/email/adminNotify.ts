import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';
import { normalizeAppBaseUrl } from '@/lib/email/emailService';

const SUBJECT_PREFIX = '[FlyGames Admin]';

function parseEmails(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes('@'));
}

/**
 * Resolve destinatários para notificações admin:
 * EmailSettings.adminNotifyEmails → SiteSettings.adminCredentialsEmail → process.env.ADMIN_NOTIFY_EMAIL
 */
export async function getAdminNotifyConfig(): Promise<{
  to: string[];
  appBaseUrl: string;
}> {
  const [emailRow, siteRow] = await Promise.all([
    prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } }),
    prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } }),
  ]);

  let to: string[] = parseEmails(emailRow?.adminNotifyEmails);
  if (to.length === 0 && siteRow?.adminCredentialsEmail?.trim()) {
    to = parseEmails(siteRow.adminCredentialsEmail);
  }
  if (to.length === 0 && process.env.ADMIN_NOTIFY_EMAIL) {
    to = parseEmails(process.env.ADMIN_NOTIFY_EMAIL);
  }

  const appBaseUrl = normalizeAppBaseUrl(emailRow?.appBaseUrl);
  return { to, appBaseUrl };
}

/**
 * Envia notificação para a lista de destinatários. Não lança erro; falhas são apenas logadas.
 */
async function sendAdminNotificationTo(
  to: string[],
  subjectSuffix: string,
  htmlBody: string
): Promise<void> {
  if (to.length === 0) return;
  try {
    const subject = `${SUBJECT_PREFIX} ${subjectSuffix}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        ${htmlBody}
        <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">Este é um e-mail automático do painel Fly Games.</p>
      </div>
    `;
    const result = await sendEmailToMany(to, subject, html);
    if (!result.success) console.error('[AdminNotify] Falha ao enviar:', result.error);
  } catch (e) {
    console.error('[AdminNotify] Erro:', e);
  }
}

/**
 * Envia notificação para os admins (resolve destinatários via getAdminNotifyConfig).
 * Não lança erro; falhas são apenas logadas.
 */
export async function sendAdminNotification(
  subjectSuffix: string,
  htmlBody: string
): Promise<void> {
  try {
    const { to } = await getAdminNotifyConfig();
    await sendAdminNotificationTo(to, subjectSuffix, htmlBody);
  } catch (e) {
    console.error('[AdminNotify] Erro:', e);
  }
}

export async function sendAdminNewUserNotification(user: {
  email: string;
  name: string | null;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  const name = user.name || user.email.split('@')[0];
  await sendAdminNotificationTo(
    to,
    `Novo usuário: ${user.email}`,
    `
      <h2 style="color: #0C1222;">Novo cadastro na plataforma</h2>
      <p><strong>E-mail:</strong> ${user.email}</p>
      <p><strong>Nome:</strong> ${name}</p>
      <p><a href="${appBaseUrl}/admin/usuarios">Ver usuários no painel</a></p>
    `
  );
}

export async function sendAdminPurchaseNotification(params: {
  userEmail: string;
  userName: string | null;
  planName: string;
  amountFormatted: string;
  typeLabel: string;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  const name = params.userName || params.userEmail.split('@')[0];
  await sendAdminNotificationTo(
    to,
    `Nova compra (${params.typeLabel}): ${params.planName} – ${params.userEmail}`,
    `
      <h2 style="color: #0C1222;">Nova compra na plataforma</h2>
      <p><strong>Tipo:</strong> ${params.typeLabel}</p>
      <p><strong>Plano/Produto:</strong> ${params.planName}</p>
      <p><strong>Valor:</strong> ${params.amountFormatted}</p>
      <p><strong>Cliente:</strong> ${name} &lt;${params.userEmail}&gt;</p>
      <p><a href="${appBaseUrl}/admin/dashboard">Ver dashboard</a></p>
    `
  );
}

export async function sendAdminSponsorNotification(params: {
  companyName: string;
  planName: string;
  amountFormatted: string;
  email: string;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  await sendAdminNotificationTo(
    to,
    `Novo patrocínio empresa: ${params.companyName} – ${params.planName}`,
    `
      <h2 style="color: #0C1222;">Novo patrocínio empresarial</h2>
      <p><strong>Empresa:</strong> ${params.companyName}</p>
      <p><strong>Plano:</strong> ${params.planName}</p>
      <p><strong>Valor:</strong> ${params.amountFormatted}</p>
      <p><strong>E-mail:</strong> ${params.email}</p>
      <p><a href="${appBaseUrl}/admin/sponsor-orders">Ver pedidos de patrocínio</a></p>
    `
  );
}

export async function sendAdminPreSaleNotification(params: {
  gameTitle: string;
  slotLabel: string;
  amountFormatted: string;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  await sendAdminNotificationTo(
    to,
    `Pré-estreia paga: ${params.gameTitle} (${params.slotLabel})`,
    `
      <h2 style="color: #0C1222;">Pré-estreia (clube) – slot pago</h2>
      <p><strong>Jogo:</strong> ${params.gameTitle}</p>
      <p><strong>Slot:</strong> ${params.slotLabel}</p>
      <p><strong>Valor:</strong> ${params.amountFormatted}</p>
      <p><a href="${appBaseUrl}/admin/pre-estreia">Ver pré-estreias</a></p>
    `
  );
}

export async function sendAdminTeamRequestNotification(params: {
  teamName: string;
  city: string | null;
  phone: string | null;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  await sendAdminNotificationTo(
    to,
    `Solicitação de cadastro de time: ${params.teamName}`,
    `
      <h2 style="color: #0C1222;">Nova solicitação de cadastro de time</h2>
      <p><strong>Time:</strong> ${params.teamName}</p>
      ${params.city ? `<p><strong>Cidade:</strong> ${params.city}</p>` : ''}
      ${params.phone ? `<p><strong>Telefone:</strong> ${params.phone}</p>` : ''}
      <p><a href="${appBaseUrl}/admin/team-requests">Ver solicitações</a></p>
    `
  );
}

export async function sendAdminTeamPortalNotification(params: {
  teamName: string;
  userEmail: string;
  userName: string | null;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  const name = params.userName || params.userEmail;
  await sendAdminNotificationTo(
    to,
    `Pedido de cadastro de time (painel): ${params.teamName}`,
    `
      <h2 style="color: #0C1222;">Novo time cadastrado (aguardando aprovação)</h2>
      <p><strong>Time:</strong> ${params.teamName}</p>
      <p><strong>Responsável:</strong> ${name} &lt;${params.userEmail}&gt;</p>
      <p><a href="${appBaseUrl}/admin/times">Ver times</a></p>
    `
  );
}

export async function sendAdminPartnerNotification(params: {
  name: string;
  companyName: string | null;
  type: string;
  whatsapp: string;
  userEmail: string;
}): Promise<void> {
  const { to, appBaseUrl } = await getAdminNotifyConfig();
  if (to.length === 0) return;
  await sendAdminNotificationTo(
    to,
    `Novo pedido de parceiro: ${params.name}`,
    `
      <h2 style="color: #0C1222;">Novo cadastro de parceiro</h2>
      <p><strong>Nome:</strong> ${params.name}</p>
      ${params.companyName ? `<p><strong>Empresa:</strong> ${params.companyName}</p>` : ''}
      <p><strong>Tipo:</strong> ${params.type}</p>
      <p><strong>WhatsApp:</strong> ${params.whatsapp}</p>
      <p><strong>E-mail da conta:</strong> ${params.userEmail}</p>
      <p><a href="${appBaseUrl}/admin/partners">Ver parceiros</a></p>
    `
  );
}
