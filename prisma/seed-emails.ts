import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function main() {
  const existing = await prisma.emailSettings.findFirst();
  if (!existing) {
    await prisma.emailSettings.create({
      data: {
        fromName: 'Fly Games',
        fromEmail: 'no-reply@flygames.com.br',
        brandColor: '#22c55e',
        appBaseUrl: baseUrl,
      },
    });
    console.log('EmailSettings criado.');
  }

  const templates = [
    {
      key: 'WELCOME',
      subject: 'Bem-vindo ao Fly Games!',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Sua conta foi criada com sucesso. Acesse o link abaixo para entrar.</p>
<p style="margin-top:24px"><a href="{{login_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar minha conta</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'VERIFY_EMAIL',
      subject: 'Verifique seu e-mail - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Clique no botão abaixo para verificar seu e-mail. O link expira em {{expires_in}} minutos.</p>
<p style="margin-top:24px"><a href="{{verify_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Verificar e-mail</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'RESET_PASSWORD',
      subject: 'Recuperação de senha - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo. O link expira em {{expires_in}} minutos.</p>
<p style="margin-top:24px"><a href="{{reset_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Redefinir senha</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'PASSWORD_CHANGED',
      subject: 'Sua senha foi alterada - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Sua senha foi alterada com sucesso. Se não foi você, entre em contato: {{support_url}}</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      create: { key: t.key, subject: t.subject, htmlBody: t.htmlBody },
      update: {},
    });
  }
  console.log('Templates de e-mail prontos.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
