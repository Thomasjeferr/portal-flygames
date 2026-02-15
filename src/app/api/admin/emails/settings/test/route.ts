import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendTestEmail } from '@/lib/email/emailService';
import { z } from 'zod';

const schema = z.object({ to: z.string().email() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'E-mail inválido' }, { status: 400 });
    const html = '<p>Este é um e-mail de teste do Fly Games.</p><p>Se você recebeu, a configuração está correta.</p>';
    const result = await sendTestEmail(parsed.data.to, 'Teste Fly Games - E-mail', html);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 });
  }
}
