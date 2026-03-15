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
    {
      key: 'TOURNAMENT_INSCRICAO_REGULAMENTO',
      subject: 'Inscrição no campeonato {{tournament_name}} – Regulamento',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<h2 style="color:#0C1222">Inscrição recebida</h2>
<p>Olá,</p>
<p>A inscrição do time <strong>{{team_name}}</strong> no campeonato <strong>{{tournament_name}}</strong> foi registrada com sucesso.</p>
<p>Abaixo seguem as regras/regulamento do campeonato para sua consulta.</p>
{{bloco_regulamento_url}}{{bloco_regulamento_texto}}
<p style="margin-top:24px">Você também pode acessar o painel do time para ver o campeonato e as regras a qualquer momento.</p>
<p style="margin-top:16px"><a href="{{painel_url}}" style="display:inline-block;padding:12px 24px;background:#64748b;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar painel do time</a></p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'LIVE_SCHEDULED',
      subject: 'Nova live programada: {{live_title}} – Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
<h2 style="color:#0C1222;margin:0 0 8px 0;font-size:22px">Olá, {{name}}! 👋</h2>
<p style="color:#374151;margin:0 0 20px 0;font-size:15px;line-height:1.5">Programamos uma nova transmissão ao vivo. Anote na agenda e não perca!</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid {{brand_color}}">
<p style="margin:0 0 8px 0;font-size:14px;color:#374151"><strong>Live:</strong> {{live_title}}</p>
<p style="margin:0;font-size:14px;color:#374151"><strong>Início:</strong> {{live_start_at}}</p>
</div>
<p style="margin:20px 0 0 0;font-size:15px;color:#374151;line-height:1.5">Clique no botão abaixo para ver os detalhes e garantir seu lugar na transmissão.</p>
<p style="margin-top:24px"><a href="{{live_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Ver detalhes e assistir</a></p>
<p style="margin-top:28px;font-size:15px;color:#374151">Até lá! 📺</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'LIVE_STARTED',
      subject: 'Ao vivo agora: {{live_title}} – Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
<h2 style="color:#0C1222;margin:0 0 8px 0;font-size:22px">Está ao vivo, {{name}}! 🔴</h2>
<p style="color:#374151;margin:0 0 20px 0;font-size:15px;line-height:1.5">A live que você aguardava começou. Corre que dá tempo de acompanhar do início!</p>
<div style="background:#fef2f2;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid #dc2626">
<p style="margin:0;font-size:14px;color:#374151"><strong>{{live_title}}</strong></p>
</div>
<p style="margin:20px 0 0 0;font-size:15px;color:#374151;line-height:1.5">Acesse agora e aproveite a transmissão.</p>
<p style="margin-top:24px"><a href="{{live_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Assistir agora</a></p>
<p style="margin-top:28px;font-size:15px;color:#374151">Bom jogo! ⚽</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'LIVE_CANCELLED',
      subject: 'Live cancelada: {{live_title}} – Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
<h2 style="color:#0C1222;margin:0 0 8px 0;font-size:22px">Olá, {{name}}!</h2>
<p style="color:#374151;margin:0 0 20px 0;font-size:15px;line-height:1.5">Infelizmente precisamos informar que a live abaixo foi cancelada.</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid #64748b">
<p style="margin:0 0 8px 0;font-size:14px;color:#374151"><strong>Live:</strong> {{live_title}}</p>
<p style="margin:0;font-size:14px;color:#374151">{{live_start_line}}</p>
</div>
<p style="margin:20px 0 0 0;font-size:15px;color:#374151;line-height:1.5">Fique de olho no site e nas próximas transmissões — em breve teremos mais conteúdo para você.</p>
<p style="margin-top:28px;font-size:15px;color:#374151">Obrigado por fazer parte do Fly Games.</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'GAME_PUBLISHED',
      subject: 'Novo jogo disponível: {{game_title}} – Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
<h2 style="color:#0C1222;margin:0 0 8px 0;font-size:22px">Olá, {{name}}! 👋</h2>
<p style="color:#374151;margin:0 0 20px 0;font-size:15px;line-height:1.5">Um novo jogo acaba de ser publicado e já está disponível para você assistir.</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid {{brand_color}}">
<p style="margin:0 0 8px 0;font-size:14px;color:#374151"><strong>Jogo:</strong> {{game_title}}</p>
<p style="margin:0;font-size:14px;color:#374151"><strong>Campeonato:</strong> {{game_championship}}</p>
</div>
<p style="margin:20px 0 0 0;font-size:15px;color:#374151;line-height:1.5">Clique no botão abaixo e aproveite o conteúdo.</p>
<p style="margin-top:24px"><a href="{{game_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Assistir agora</a></p>
<p style="margin-top:28px;font-size:15px;color:#374151">Bom jogo! ⚽</p>
<p style="margin-top:24px;font-size:12px;color:#6b7280">{{footer_text}}</p>
</div></body></html>`,
    },
    {
      key: 'SUBSCRIPTION_ACTIVATED',
      subject: 'Sua assinatura foi ativada – Fly Games',
      htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif;padding:24px;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
<h2 style="color:#0C1222;margin:0 0 8px 0;font-size:22px">Olá, {{name}}! 👋</h2>
<p style="color:#374151;margin:0 0 20px 0;font-size:15px;line-height:1.5">Que bom ter você conosco! Sua assinatura no Fly Games foi ativada e você já pode aproveitar todo o conteúdo disponível.</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid {{brand_color}}">
<p style="margin:0 0 8px 0;font-size:14px;color:#374151"><strong>Período:</strong> {{period_label}}</p>
<p style="margin:0;font-size:14px;color:#374151"><strong>Válida até:</strong> {{end_date}}</p>
</div>
<p style="margin:20px 0 0 0;font-size:15px;color:#374151;line-height:1.5">Acesse sua conta abaixo e comece a assistir. Qualquer dúvida, estamos à disposição.</p>
<p style="margin-top:24px"><a href="{{login_url}}" style="display:inline-block;padding:12px 24px;background:{{brand_color}};color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar minha conta</a></p>
<p style="margin-top:28px;font-size:15px;color:#374151">Obrigado por fazer parte do Fly Games. Bom jogo! ⚽</p>
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
