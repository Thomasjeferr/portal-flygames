import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { heartbeatSchema } from '@/lib/pre-sale/validations';
import { SESSION_TTL_SECONDS } from '@/lib/pre-sale/enums';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { sessionToken, clubCode } = parsed.data;

    const session = await prisma.clubStreamSession.findUnique({
      where: { sessionToken },
    });
    if (!session) return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 404 });
    if (session.clubCode !== clubCode) return NextResponse.json({ error: 'Código do clube não confere' }, { status: 403 });

    const now = new Date();
    if (session.expiresAt <= now) return NextResponse.json({ error: 'Sessão expirada' }, { status: 410 });

    const newExpiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    await prisma.clubStreamSession.update({
      where: { id: session.id },
      data: { lastHeartbeatAt: now, expiresAt: newExpiresAt },
    });

    return NextResponse.json({ ok: true, expiresAt: newExpiresAt.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro no heartbeat' }, { status: 500 });
  }
}
