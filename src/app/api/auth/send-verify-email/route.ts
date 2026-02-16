import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import {
  generateVerificationCode,
  hashToken,
  getVerificationCodeExpiryDate,
} from '@/lib/email/tokenUtils';

const schema = z.object({ email: z.string().email('E-mail inválido') });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'E-mail inválido' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'Se o e-mail existir, você receberá o código.' }, { status: 200 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'E-mail já verificado.' }, { status: 200 });
    }

    const code = generateVerificationCode();
    const tokenHash = hashToken(code);
    const expiresAt = getVerificationCodeExpiryDate();

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'VERIFY_EMAIL',
        tokenHash,
        expiresAt,
      },
    });

    const result = await sendTransactionalEmail({
      to: user.email,
      templateKey: 'VERIFY_EMAIL',
      vars: {
        name: user.name || user.email.split('@')[0],
        code,
        expires_in: '15',
      },
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Erro ao enviar e-mail' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Código enviado para seu e-mail. Verifique sua caixa de entrada.',
    });
  } catch (e) {
    console.error('[send-verify-email]', e);
    return NextResponse.json({ error: 'Erro ao enviar código' }, { status: 500 });
  }
}
