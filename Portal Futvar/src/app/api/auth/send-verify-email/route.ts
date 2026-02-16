import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { generateSecureToken, hashToken, getExpiryDate } from '@/lib/email/tokenUtils';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ message: 'E-mail ja verificado.' }, { status: 200 });
  }

  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = getExpiryDate();

  await prisma.emailToken.create({
    data: {
      userId: user.id,
      type: 'VERIFY_EMAIL',
      tokenHash,
      expiresAt,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const settings = await prisma.emailSettings.findFirst();
  const baseUrl = settings?.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const result = await sendTransactionalEmail({
    to: user.email,
    templateKey: 'VERIFY_EMAIL',
    vars: {
      name: user.name || user.email.split('@')[0],
      verify_url: verifyUrl,
      expires_in: '60',
    },
    userId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Erro ao enviar e-mail' }, { status: 500 });
  }

  return NextResponse.json({ message: 'E-mail de verificacao enviado.' }, { status: 200 });
}
