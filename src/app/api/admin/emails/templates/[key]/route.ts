import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { emailTemplateSchema } from '@/lib/validators/emailSchema';
const KEYS = ['WELCOME', 'VERIFY_EMAIL', 'RESET_PASSWORD', 'PASSWORD_CHANGED'] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const key = (await params).key;
  if (!KEYS.includes(key as (typeof KEYS)[number]))
    return NextResponse.json({ error: 'Template inválido' }, { status: 404 });
  const template = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!template) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(
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
    const body = await request.json();
    const parsed = emailTemplateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    await prisma.emailTemplate.upsert({
      where: { key },
      create: { key, subject: parsed.data.subject, htmlBody: parsed.data.html_body, isActive: parsed.data.is_active },
      update: { subject: parsed.data.subject, htmlBody: parsed.data.html_body, isActive: parsed.data.is_active },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}
