import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';
import { generateSecureToken, hashToken, getExpiryDate } from '@/lib/email/tokenUtils';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
  }

  let email = team.responsibleEmail?.trim().toLowerCase() || '';
  const body = await request.json().catch(() => ({}));
  if (typeof body.email === 'string' && body.email.trim()) {
    email = body.email.trim().toLowerCase();
  }
  if (!email) {
    return NextResponse.json(
      { error: 'Nenhum e-mail do responsável cadastrado. Preencha o e-mail na seção "Dados do responsável" e salve.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      {
        error:
          'Não existe conta com este e-mail. Se o responsável informou o e-mail errado, corrija o e-mail acima, salve e tente enviar o reset novamente (o e-mail correto precisa já estar cadastrado no site).',
      },
      { status: 400 }
    );
  }

  try {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = getExpiryDate();

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'RESET_PASSWORD',
        tokenHash,
        expiresAt,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'admin',
        userAgent: request.headers.get('user-agent') ?? null,
      },
    });

    const settings = await prisma.emailSettings.findFirst();
    const baseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
    const resetUrl = `${baseUrl}/recuperar-senha?token=${token}`;

    await sendTransactionalEmail({
      to: user.email,
      templateKey: 'RESET_PASSWORD',
      vars: {
        name: user.name || user.email.split('@')[0],
        reset_url: resetUrl,
        expires_in: '60',
      },
      userId: user.id,
    });

    return NextResponse.json({ message: 'E-mail de redefinição de senha enviado com sucesso.' });
  } catch (e) {
    console.error('send-reset-password admin', e);
    return NextResponse.json({ error: 'Erro ao enviar e-mail de redefinição.' }, { status: 500 });
  }
}
