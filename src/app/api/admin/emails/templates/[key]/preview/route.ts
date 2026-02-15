import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { renderTemplate } from '@/lib/email/templateRenderer';

const KEYS = ['WELCOME', 'VERIFY_EMAIL', 'RESET_PASSWORD', 'PASSWORD_CHANGED'] as const;
const SAMPLE_VARS: Record<string, Record<string, string>> = {
  WELCOME: { name: 'João', login_url: 'http://localhost:3000/entrar' },
  VERIFY_EMAIL: { name: 'João', verify_url: 'http://localhost:3000/verify-email?token=xxx', expires_in: '60' },
  RESET_PASSWORD: { name: 'João', reset_url: 'http://localhost:3000/recuperar-senha?token=xxx', expires_in: '60' },
  PASSWORD_CHANGED: { name: 'João', support_url: 'mailto:suporte@flygames.com.br' },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const key = (await params).key;
  if (!KEYS.includes(key as (typeof KEYS)[number]))
    return NextResponse.json({ error: 'Template inválido' }, { status: 404 });
  try {
    const body = (await request.json()) || {};
    const template = await prisma.emailTemplate.findUnique({ where: { key } });
    if (!template) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    const settings = await prisma.emailSettings.findFirst();
    const vars = {
      ...SAMPLE_VARS[key as (typeof KEYS)[number]],
      ...body,
      brand_color: body.brand_color ?? settings?.brandColor ?? '#22c55e',
      footer_text: body.footer_text ?? settings?.footerText ?? '© Fly Games',
    };
    const html = renderTemplate(template.htmlBody, vars);
    const subject = renderTemplate(template.subject, vars);
    return NextResponse.json({ html, subject });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 });
  }
}
