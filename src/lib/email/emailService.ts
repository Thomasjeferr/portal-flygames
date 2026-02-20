import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { renderTemplate, extractTextFromHtml } from './templateRenderer';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || typeof key !== 'string' || key.trim().length === 0) return null;
  return new Resend(key);
}

export type EmailTemplateKey =
  | 'WELCOME'
  | 'VERIFY_EMAIL'
  | 'RESET_PASSWORD'
  | 'PASSWORD_CHANGED'
  | 'PURCHASE_CONFIRMATION'
  | 'SPONSOR_CONFIRMATION'
  | 'LIVE_PURCHASE_CONFIRMATION'
  | 'PRE_SALE_CREDENTIALS'
  | 'PRE_SALE_CREDENTIALS_NEW_PASSWORD';

async function getEmailSettings() {
  const row = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';
  return {
    fromName: row?.fromName ?? 'Fly Games',
    fromEmail: row?.fromEmail ?? 'no-reply@flygames.app',
    replyTo: row?.replyTo ?? null,
    brandColor: row?.brandColor ?? '#22c55e',
    logoUrl: row?.logoUrl ?? null,
    supportEmail: row?.supportEmail ?? null,
    whatsappUrl: row?.whatsappUrl ?? null,
    footerText: row?.footerText ?? null,
    appBaseUrl: row?.appBaseUrl ?? baseUrl,
  };
}

export async function getTemplate(key: EmailTemplateKey) {
  return prisma.emailTemplate.findUnique({
    where: { key, isActive: true },
  });
}

export async function sendTransactionalEmail(params: {
  to: string;
  templateKey: EmailTemplateKey;
  vars: Record<string, string>;
  userId?: string | null;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, templateKey, vars, userId } = params;

  if (!process.env.RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY não configurada');
    await logEmail(userId, to, templateKey, 'FAILED', null, 'RESEND_API_KEY não configurada');
    return { success: false, error: 'E-mail não configurado' };
  }

  const [template, settings] = await Promise.all([
    getTemplate(templateKey),
    getEmailSettings(),
  ]);

  if (!template) {
    await logEmail(userId, to, templateKey, 'FAILED', null, `Template ${templateKey} não encontrado ou inativo`);
    return { success: false, error: 'Template não encontrado' };
  }

  const allVars = {
    ...vars,
    brand_color: vars.brand_color ?? settings.brandColor,
    footer_text: vars.footer_text ?? settings.footerText ?? '© Fly Games. Todos os direitos reservados.',
    support_url: vars.support_url ?? settings.supportEmail ? `mailto:${settings.supportEmail}` : settings.appBaseUrl,
  };

  const html = renderTemplate(template.htmlBody, allVars);
  const text = extractTextFromHtml(html);

  const client = getResend();
  if (!client) {
    await logEmail(userId, to, templateKey, 'FAILED', null, 'RESEND_API_KEY não configurada');
    return { success: false, error: 'E-mail não configurado' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: [to],
      replyTo: settings.replyTo ?? undefined,
      subject: renderTemplate(template.subject, allVars),
      html,
      text,
    });

    if (error) {
      await logEmail(userId, to, templateKey, 'FAILED', null, error.message);
      return { success: false, error: error.message };
    }

    await logEmail(userId, to, templateKey, 'SENT', data?.id ?? null, null);
    return { success: true, messageId: data?.id };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Erro desconhecido';
    await logEmail(userId, to, templateKey, 'FAILED', null, errMsg);
    return { success: false, error: errMsg };
  }
}

async function logEmail(
  userId: string | null | undefined,
  toEmail: string,
  templateKey: string,
  status: 'SENT' | 'FAILED',
  providerMessageId: string | null,
  errorMessage: string | null
) {
  try {
    await prisma.emailLog.create({
      data: {
        userId: userId ?? null,
        toEmail,
        templateKey,
        provider: 'RESEND',
        status,
        providerMessageId,
        errorMessage,
      },
    });
  } catch (e) {
    console.error('[Email] Erro ao registrar log:', e);
  }
}

export async function sendTestEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    return { success: false, error: 'RESEND_API_KEY não configurada' };
  }

  const row = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  const fromName = row?.fromName ?? 'Fly Games';
  const fromEmail = row?.fromEmail ?? 'no-reply@flygames.app';

  try {
    const { error } = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

/** Envia e-mail para múltiplos destinatários (ex.: credenciais pré-estreia). */
export async function sendEmailToMany(
  to: string[],
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    return { success: false, error: 'RESEND_API_KEY não configurada' };
  }
  const row = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  const fromName = row?.fromName ?? 'Fly Games';
  const fromEmail = row?.fromEmail ?? 'no-reply@flygames.app';
  const validTo = to.filter((e) => e && String(e).trim().length > 0);
  if (validTo.length === 0) return { success: false, error: 'Nenhum destinatário válido' };
  try {
    const { error } = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: validTo,
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
