import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { z } from 'zod';

const KEYS = ['WELCOME', 'VERIFY_EMAIL', 'RESET_PASSWORD', 'PASSWORD_CHANGED'] as const;
const schema = z.object({ to: z.string().email() });

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  WELCOME: { name: 'Teste', login_url: 'http://localhost:3000/entrar' },
  VERIFY_EMAIL: { name: 'Teste', verify_url: 'http://localhost:3000/verify-email?token=test', expires_in: '60' },
  RESET_PASSWORD: { name: 'Teste', reset_url: 'http://localhost:3000/recuperar-senha?token=test', expires_in: '60' },
  PASSWORD_CHANGED: { name: 'Teste', support_url: 'mailto:suporte@flygames.com.br' },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const key = (await params).key as (typeof KEYS)[number];
  if (!KEYS.includes(key))
    return NextResponse.json({ error: 'Template inválido' }, { status: 404 });
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'E-mail inválido' }, { status: 400 });
    const vars = SAMPLE_VARS[key];
    const result = await sendTransactionalEmail({
      to: parsed.data.to,
      templateKey: key,
      vars,
    });
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 });
  }
}
