import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { generateSecureToken, hashToken, getExpiryDate } from '@/lib/email/tokenUtils';
import { checkForgotPasswordRateLimit, incrementForgotPasswordRateLimit } from '@/lib/email/rateLimit';

const schema = z.object({ email: z.string().email('E-mail inválido') });

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Se o e-mail existir, você receberá o link de recuperação.' }, { status: 200 });
    }

    const { email } = parsed.data;
    const ip = getClientIp(request);

    const allowed = await checkForgotPasswordRateLimit(ip, email);
    if (!allowed) {
      return NextResponse.json({ message: 'Se o e-mail existir, você receberá o link de recuperação.' }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ message: 'Se o e-mail existir, você receberá o link de recuperação.' }, { status: 200 });
    }

    await incrementForgotPasswordRateLimit(ip, email);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = getExpiryDate();

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'RESET_PASSWORD',
        tokenHash,
        expiresAt,
        ip,
        userAgent: request.headers.get('user-agent') ?? null,
      },
    });

    const settings = await prisma.emailSettings.findFirst();
    const baseUrl = settings?.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://flygames.app';
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

    return NextResponse.json({ message: 'Se o e-mail existir, você receberá o link de recuperação.' }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Se o e-mail existir, você receberá o link de recuperação.' }, { status: 200 });
  }
}
