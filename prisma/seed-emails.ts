import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';

async function main() {
  const existing = await prisma.emailSettings.findFirst();
  if (!existing) {
    await prisma.emailSettings.create({
      data: {
        fromName: 'Fly Games',
        fromEmail: 'no-reply@flygames.app',
        brandColor: '#22c55e',
        appBaseUrl: baseUrl,
      },
    });
    console.log('EmailSettings criado.');
  }

  const templates = [
    {
      key: 'WELCOME',
      subject: 'Sua conta foi ativada – Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Seu e-mail foi verificado e sua conta está ativa. Acesse o link abaixo para entrar.</p>
<p style="margin-top:24px"><a href="{{login_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar minha conta</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'VERIFY_EMAIL',
      subject: 'Seu código de verificação - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Use o código abaixo para verificar seu e-mail. O código expira em {{expires_in}} minutos.</p>
<p style="margin-top:24px;font-size:28px;font-weight:bold;letter-spacing:8px;color:#0C1222;background:#f0f0f0;padding:16px;border-radius:8px;text-align:center">{{code}}</p>
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
      key: 'PURCHASE_CONFIRMATION',
      subject: 'Compra confirmada - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Sua compra foi confirmada com sucesso.</p>
<p><strong>Plano:</strong> {{plan_name}}</p>
<p><strong>Valor:</strong> R$ {{amount}}</p>
<p>Obrigado por escolher o Fly Games!</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SPONSOR_CONFIRMATION',
      subject: 'Patrocínio confirmado - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá!</p>
<p>O pedido de patrocínio da empresa <strong>{{company_name}}</strong> foi confirmado.</p>
<p><strong>Plano:</strong> {{plan_name}}</p>
<p><strong>Valor:</strong> R$ {{amount}}</p>
<p>Obrigado por escolher o Fly Games!</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'LIVE_PURCHASE_CONFIRMATION',
      subject: 'Compra da live confirmada - Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p>Olá {{name}}!</p>
<p>Sua compra da live foi confirmada.</p>
<p><strong>Live:</strong> {{live_title}}</p>
<p><strong>Valor:</strong> R$ {{amount}}</p>
<p>Acesse sua conta para assistir quando a transmissão começar.</p>
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
    {
      key: 'PRE_SALE_CREDENTIALS',
      subject: 'Acesso à pré-estreia: {{game_title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#111">Acesso à pré-estreia - Credenciais</h2>
<p>Olá,</p>
<p>{{intro_text}}</p>
<p><strong>Jogo:</strong> {{game_title}}</p>
<p><strong>Link para assistir:</strong> <a href="{{watch_url}}">{{watch_url}}</a></p>
<p><strong>Usuário:</strong> <code style="background:#f0f0f0;padding:2px 6px">{{username}}</code></p>
<p><strong>Senha:</strong> <code style="background:#f0f0f0;padding:2px 6px">{{password}}</code></p>
<p style="margin-top:16px;padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;font-weight:bold"><strong>{{limite_dispositivos}}</strong></p>
<p style="margin-top:16px;padding:12px;background:#f0fdf4;border-left:4px solid #22c55e"><strong>{{info_assinante}}</strong></p>
<p>Compartilhe o usuário e a senha com os membros do clube. Este acesso vale apenas para este jogo de pré-estreia.</p>
<p>Para comprar planos ou outros jogos no site, é necessário criar uma conta normal (cadastro).</p>
<p style="margin-top:24px;color:#666;font-size:12px">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'PRE_SALE_CREDENTIALS_NEW_PASSWORD',
      subject: 'Nova senha - Pré-estreia: {{game_title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#111">Nova senha de acesso à pré-estreia</h2>
<p>Olá,</p>
<p>Foi gerada uma nova senha para o acesso à pré-estreia.</p>
<p><strong>Jogo:</strong> {{game_title}}</p>
<p><strong>Link para assistir:</strong> <a href="{{watch_url}}">{{watch_url}}</a></p>
<p><strong>Usuário:</strong> <code style="background:#f0f0f0;padding:2px 6px">{{username}}</code></p>
<p><strong>Senha:</strong> <code style="background:#f0f0f0;padding:2px 6px">{{password}}</code></p>
<p style="margin-top:16px;padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;font-weight:bold"><strong>{{limite_dispositivos}}</strong></p>
<p style="margin-top:16px;padding:12px;background:#f0fdf4;border-left:4px solid #22c55e"><strong>{{info_assinante}}</strong></p>
<p>Compartilhe o usuário e a senha com os membros do clube. Este acesso vale apenas para este jogo de pré-estreia.</p>
<p style="margin-top:24px;color:#666;font-size:12px">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SUMULA_DISPONIVEL',
      subject: 'Súmula disponível para aprovação – {{title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#0C1222">Súmula disponível para aprovação</h2>
<p>Olá,</p>
<p>A súmula do jogo <strong>{{title}}</strong> está disponível para aprovação.</p>
<p>Acesse o painel do time para aprovar ou rejeitar.</p>
<p style="margin-top:24px"><a href="{{painel_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#0C1222!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar painel do time</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SUMULA_ATUALIZADA',
      subject: 'Súmula atualizada – {{title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#0C1222">Súmula atualizada</h2>
<p>Olá,</p>
<p>A súmula do jogo <strong>{{title}}</strong> foi atualizada pelo organizador.</p>
<p>Por favor, acesse o painel do time para conferir e aprovar ou rejeitar.</p>
<p style="margin-top:24px"><a href="{{painel_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#0C1222!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar painel do time</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SUMULA_OUTRO_APROVOU',
      subject: 'Súmula aprovada pelo outro time – {{title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#0C1222">Outro time aprovou a súmula</h2>
<p>Olá,</p>
<p>O time <strong>{{approving_team_name}}</strong> aprovou a súmula do jogo <strong>{{title}}</strong>.</p>
<p>Aguardamos sua aprovação para que a súmula seja oficial.</p>
<p style="margin-top:24px"><a href="{{painel_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#0C1222!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar painel e aprovar</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SUMULA_OUTRO_REJEITOU',
      subject: 'Súmula rejeitada pelo outro time – {{title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#0C1222">Outro time rejeitou a súmula</h2>
<p>Olá,</p>
<p>O time <strong>{{rejecting_team_name}}</strong> rejeitou a súmula do jogo <strong>{{title}}</strong>.</p>
<p><strong>Motivo:</strong> {{rejection_reason}}</p>
<p>O organizador pode ajustar os dados. Quando republicar, você poderá aprovar ou rejeitar novamente no painel do time.</p>
<p style="margin-top:24px"><a href="{{painel_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#0C1222!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar painel do time</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SUMULA_APROVADA_AMBOS',
      subject: 'Súmula aprovada por ambos os times – {{title}}',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#0C1222">Súmula aprovada</h2>
<p>Olá,</p>
<p>A súmula do jogo <strong>{{title}}</strong> foi aprovada por ambos os times.</p>
<p>Ela já pode ser visualizada em <strong>Resultados aprovados</strong>.</p>
<p style="margin-top:24px"><a href="{{resultados_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#0C1222!important;text-decoration:none;border-radius:8px;font-weight:600">Ver Resultados aprovados</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      create: { key: t.key, subject: t.subject, htmlBody: t.htmlBody },
      update: { subject: t.subject, htmlBody: t.htmlBody },
    });
  }
  console.log('Templates de e-mail prontos.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
