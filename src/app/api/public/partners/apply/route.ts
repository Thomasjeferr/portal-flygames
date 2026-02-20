import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import { checkPartnerApplyRateLimit, incrementPartnerApplyRateLimit } from '@/lib/email/rateLimit';
import { sendEmailToMany } from '@/lib/email/emailService';

const bodySchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  companyName: z.string().optional(),
  type: z.enum(['revendedor', 'influencer', 'lojista', 'outro']),
  whatsapp: z.string().min(8, 'Informe um WhatsApp válido'),
  city: z.string().optional(),
  state: z.string().optional(),
});

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

function generateRefCodeBase() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'FG-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Faça login ou cadastre-se para solicitar parceria.' },
        { status: 401 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await checkPartnerApplyRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitos cadastros neste período. Tente novamente em 1 hora.' },
        { status: 429 }
      );
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;

    let refCode = generateRefCodeBase();
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.partner.findUnique({ where: { refCode } });
      if (!existing) break;
      refCode = generateRefCodeBase();
    }

    await prisma.partner.create({
      data: {
        userId: session.userId,
        name: data.name.trim(),
        companyName: data.companyName?.trim() || null,
        type: data.type,
        status: 'pending',
        whatsapp: data.whatsapp.replace(/\D/g, ''),
        city: data.city?.trim() || null,
        state: data.state?.trim().toUpperCase() || null,
        refCode,
        document: null,
      },
    });

    await incrementPartnerApplyRateLimit(ip);

    const toEmail = session.email;
    if (toEmail) {
      const subject = 'Recebemos seu cadastro de parceiro – Fly Games';
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0C1222;">Cadastro recebido</h2>
          <p>Olá${session.name ? `, ${session.name}` : ''},</p>
          <p>Recebemos seu cadastro para o <strong>Programa de Parceiros</strong> da Fly Games.</p>
          <p>Nossa equipe vai analisar suas informações e entrar em contato pelo WhatsApp informado.</p>
          <p>Assim que seu cadastro for aprovado, você receberá um código exclusivo para indicar assinantes, jogos e patrocinadores e ganhar comissão sobre cada venda.</p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany([toEmail], subject, html).catch((e) =>
        console.error('[partners/apply] Erro ao enviar e-mail de confirmação:', e)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('partners/apply', e);
    return NextResponse.json({ error: 'Erro ao salvar cadastro' }, { status: 500 });
  }
}

